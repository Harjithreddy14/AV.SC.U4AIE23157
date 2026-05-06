const { getTopNotifications } = require("./notification_app_be/src/domain/priorityInbox");

const notifications = [
  {
    Type: "Placement",
    Timestamp: "2026-05-06T10:00:00Z",
  },
  {
    Type: "Event",
    Timestamp: "2026-05-06T11:00:00Z",
  },
];

console.log(getTopNotifications(notifications));