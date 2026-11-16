const container = require('../services/container');
const { ok } = require('../utils/response');

exports.get = async (req, res) => {
  ok(res, await container.cartService.getCart(req.user.id));
};

exports.addItem = async (req, res) => {
  ok(res, await container.cartService.addItem(req.user.id, req.body));
};

exports.updateItem = async (req, res) => {
  ok(res, await container.cartService.updateItem(req.user.id, req.params.productId, req.body.qty));
};

exports.removeItem = async (req, res) => {
  ok(res, await container.cartService.removeItem(req.user.id, req.params.productId));
};
