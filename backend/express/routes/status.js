const { models } = require("../../sequelize");
const { pickHostIp } = require("../helpers");

async function getStatus(req, res) {
  await models.status.checkDatabase();
  res.json({ status: "ok" });
}

async function getHostIp(req, res) {
  res.json({ hostIp: pickHostIp() });
}

module.exports = {
  getStatus,
  getHostIp,
};
