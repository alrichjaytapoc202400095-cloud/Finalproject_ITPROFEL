const container = require('../services/container');
const { ok } = require('../utils/response');

exports.checkout = async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || null;
  const { order, checkoutUrl, replayed } = await container.checkoutService.placeOrder(req.user, req.body, idempotencyKey);
  if (replayed) {
    ok(res, { order, checkoutUrl: order.payment.checkoutUrl }, { replayed: true });
  } else {
    ok(res, { order, checkoutUrl }, null, 201);
  }
};
