function solveKnapsack(depot, vehicles) {
  const n = vehicles.length;
  const W = depot.MechanicHours;

  const dp = Array(n + 1)
    .fill()
    .map(() => Array(W + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const duration = vehicles[i - 1].Duration;
    const impact = vehicles[i - 1].Impact;

    for (let w = 0; w <= W; w++) {
      if (duration <= w) {
        dp[i][w] = Math.max(
          impact + dp[i - 1][w - duration],
          dp[i - 1][w]
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  let w = W;
  const selectedTasks = [];

  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedTasks.push(vehicles[i - 1]);
      w -= vehicles[i - 1].Duration;
    }
  }

  return {
    depotID: depot.ID,
    totalImpact: dp[n][W],
    scheduledTasks: selectedTasks,
  };
}

function scheduleAllDepots(depots, vehicles) {
  const results = [];

  for (const depot of depots) {
    results.push(solveKnapsack(depot, vehicles));
  }

  return results;
}

module.exports = { solveKnapsack, scheduleAllDepots };