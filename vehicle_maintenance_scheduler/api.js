const axios = require("axios");
require("dotenv").config();
console.log(process.env.BASE_URL);
const api = axios.create({
  baseURL: process.env.BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.TOKEN}`,
  },
});

async function getDepots() {
  const res = await api.get("/depots");
  return res.data.depots;
}

async function getVehicles() {
  const res = await api.get("/vehicles");
  return res.data.vehicles;
}

module.exports = {
  getDepots,
  getVehicles,
};