const { Log } = require("./logging_middleware");
const { getDepots, getVehicles } = require("./api");
const { solveKnapsack } = require("./scheduler");

async function main() {
  const { getDepots, getVehicles } = require("./api");
const { solveKnapsack } = require("./scheduler");
const { Log } = require("./logging_middleware");

async function main() {
  try {
    await Log("backend", "info", "scheduler", "Fetching depots");

    const depots = await getDepots();

    await Log("backend", "info", "scheduler", "Fetching vehicles");

    const vehicles = await getVehicles();

    for (const depot of depots) {
      const result = await solveKnapsack(depot, vehicles);

      await Log(
        "backend",
        "info",
        "scheduler",
        `Processed depot ${result.depotID}`
      );

      console.log("\nDepot ID:", result.depotID);
      console.log("Total Impact:", result.totalImpact);
      console.log("Tasks Selected:", result.scheduledTasks.length);
    }
  } catch (err) {
    console.log(err.message);
  }
}

main();