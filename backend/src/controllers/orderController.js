const container = require('../services/container');
const { ok } = require('../utils/response');

exports.list = async (req, res) => {
  const { items, meta } = await container.orderService.listMine(req.user, req.query);
  ok(res, items, meta);
};

exports.get = async (req, res) => {
  ok(res, await container.orderService.getForCustomer(req.user, req.params.id));
};

exports.cancel = async (req, res) => {
  const order = await container.orderService.cancelByCustomer(req.user, req.params.id);
  await container.inventoryService.releaseFor(order);
  ok(res, order);
};

exports.retryPayment = async (req, res) => {
  const { order, checkoutUrl } = await container.checkoutService.retryPayment(req.user, req.params.id);
  ok(res, { order, checkoutUrl });
};
