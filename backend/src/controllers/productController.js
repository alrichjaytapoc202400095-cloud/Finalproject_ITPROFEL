const container = require('../services/container');
const { ok } = require('../utils/response');

exports.categories = async (req, res) => {
  ok(res, await container.productService.listCategories());
};

exports.list = async (req, res) => {
  const { items, meta } = await container.productService.listPublic(req.query);
  ok(res, items, meta);
};

exports.get = async (req, res) => {
  ok(res, await container.productService.getPublic(req.params.id));
};
