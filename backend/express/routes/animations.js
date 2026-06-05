const { models } = require("../../sequelize");
const { getIdParam } = require("../helpers");

async function checkName(req, res) {
  const name = req.query.name?.trim();

  if (!name) {
    res.json({ exists: false });
    return;
  }

  const exists = await models.animation.checkNameExists(name);
  res.json({ exists });
}

async function create(req, res) {
  const id = await models.animation.create(req.body);
  res.json({ success: true, id });
}

async function getAll(req, res) {
  const animations = await models.animation.findAll();
  res.status(200).json(animations);
}

async function getById(req, res) {
  const id = getIdParam(req);
  const animation = await models.animation.findByPk(id);

  if (!animation) {
    res.status(404).json({ error: "Animation not found" });
    return;
  }

  res.status(200).json(animation);
}

async function remove(req, res) {
  const id = getIdParam(req);
  const changes = await models.animation.destroy(id);

  if (changes === 0) {
    res.status(404).json({ error: "Animation not found" });
    return;
  }

  res.json({ success: true, deletedId: id });
}

module.exports = {
  checkName,
  create,
  getAll,
  getById,
  remove,
};
