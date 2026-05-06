function getTypeWeight(type) {
  if (type === "Placement") return 3;
  if (type === "Result") return 2;
  return 1;
}

function calculatePriority(notification) {
  const typeWeight = getTypeWeight(notification.Type);

  const recencyScore = new Date(notification.Timestamp).getTime();

  return typeWeight * 10000000000000 + recencyScore;
}

function getTopNotifications(notifications, topN = 10) {
  const scored = notifications.map((n) => ({
    ...n,
    priorityScore: calculatePriority(n),
  }));

  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  return scored.slice(0, topN);
}

module.exports = { getTopNotifications };