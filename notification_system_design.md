# Notification System Design

## Stage 1

Core actions needed: fetch notifications, mark as read, unread count, real-time updates.

**Endpoints**

```
GET    /api/v1/notifications            - list (page, limit, type, isRead filters)
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
GET    /api/v1/notifications/priority?limit=10
```

All routes need `Authorization: Bearer <token>`.

Sample response for GET /notifications:
```json
{
  "data": [{ "id": "uuid", "type": "Placement", "message": "CSX hiring", "isRead": false, "createdAt": "2026-04-22T17:51:18Z" }],
  "meta": { "total": 150, "page": 1, "limit": 20 }
}
```

**Real-time: SSE**

Going with Server-Sent Events over WebSockets — notifications only go server→client so WebSockets is overkill. SSE works on plain HTTP and reconnects automatically.

```
GET /api/v1/notifications/stream
Content-Type: text/event-stream

event: notification
data: {"id":"uuid","type":"Placement","message":"CSX hiring"}
```

---

## Stage 2

**DB: PostgreSQL**

Straightforward relational data, notifications belong to a student. Easy to filter/sort with indexes, ACID so nothing gets lost.

```sql
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unread ON notifications(student_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_type   ON notifications(student_id, type, created_at DESC);
```

Problems at scale: seq scans without indexes, unread count query getting slow, old data piling up. Fix with partial indexes, cache the unread count, archive rows older than 90 days.

Queries are straightforward selects/updates filtered by student_id — nothing fancy.

---

## Stage 3

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

Query is correct but slow — no index so postgres scans all 5M rows. `SELECT *` pulls unnecessary data. No LIMIT either.

Colleague saying "add indexes on every column" is wrong — indexing `isRead` (2 possible values) does almost nothing and hurts write performance.

Fix:
```sql
CREATE INDEX idx_unread_by_student ON notifications(student_id, created_at DESC) WHERE is_read = false;

SELECT id, type, message, created_at FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC LIMIT 50;
```

Partial index is way smaller since it only covers unread rows.

Students with placement notification in last 7 days:
```sql
SELECT DISTINCT student_id FROM notifications
WHERE type = 'Placement' AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

Every page load hitting DB with 50k students = DB melts. Fix:

- **Redis cache** — cache notification list per student, 60s TTL, invalidate on write. Handles 95%+ of reads.
- **Denormalize unread count** — store it in students table, update on insert/mark-read. Badge query becomes O(1).
- **Cursor pagination** — replace OFFSET with `WHERE created_at < :cursor`. OFFSET gets slower as pages go up.

---

## Stage 5

Issues with current code:
- Sequential loop over 50k is too slow
- No error handling — if email fails at student 200, we lose track of who failed
- 50k individual DB inserts

When send_email failed for 200 midway — no way to know which ones. Need a redesign.

```
function notify_all(student_ids, message):
  bulk_insert_notifications(student_ids, message)  # DB first, source of truth

  for student_id in student_ids:
    enqueue({ student_id, message, retries: 0 })

function worker():
  while job = dequeue():
    try:
      send_email(job.student_id, job.message)
      push_to_app(job.student_id, job.message)
    catch error:
      if job.retries < 3: requeue with backoff
      else: move to dead letter queue
```

DB save and email shouldn't be coupled — email is an external call that can fail anytime. Save to DB first always. Queue handles retries. Run 10 workers in parallel so 50k gets processed fast.

---

## Stage 6

Priority: Placement=3, Result=2, Event=1

```
score = typeWeight * 10^12 + timestampMs
```

Large multiplier ensures type always dominates — a Placement from last week still beats a Result from today. Within same type, newer wins via timestamp.

Use a min-heap of size k. For each notification, if score > heap minimum, swap it in. O(n log k) time, O(k) space. As new notifications arrive, same comparison against heap min — no need to reprocess everything.

Code in `src/domain/priorityInbox.ts`.
