const { getDepots, getVehicles } = require("./api");
const { solveKnapsack } = require("./scheduler");

async function main() {
  try {
    const depots = await getDepots();
    const vehicles = await getVehicles();

    for (const depot of depots) {
      const result = await solveKnapsack(depot, vehicles);

      console.log("\nDepot ID:", result.depotID);
      console.log("Total Impact:", result.totalImpact);
      console.log("Tasks Selected:", result.scheduledTasks.length);
    }
  } catch (err) {
    console.log(err.message);
  }
}

main();