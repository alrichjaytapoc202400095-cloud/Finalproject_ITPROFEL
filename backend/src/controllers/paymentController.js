const container = require('../services/container');
const { ok } = require('../utils/response');

// The ONLY route that receives raw bytes. Signature verification happens inside
// the payment façade against the raw body (S-07).
exports.webhook = async (req, res) => {
  const result = await container.paymentService.handleWebhook(req.body, req.headers);
  ok(res, result);
};

// Retrieve-on-return (reconciliation path): confirms status with the gateway.
exports.status = async (req, res) => {
  const { order, gateway } = await container.paymentService.statusForOwner(req.params.orderId, req.user);
  ok(res, { order, gateway });
};
