// PAYMENT FAÇADE (B.5.3): the controller calls ONE method here.
// Gateway API calls, signature verification, event storage, amount checks and
// error mapping all stay inside this module - the routes never touch them.
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { TRANSITIONS } = require('./orderService');

const SIGNATURE_HEADERS = { paymongo: 'paymongo-signature', maya: 'x-maya-webhook-signature' };

class PaymentService {
  // deps: { paymentProvider, orderService, inventoryService }
  constructor(deps) {
    this.provider = deps.paymentProvider;
    this.orders = deps.orderService;
    this.inventory = deps.inventoryService;
  }

  // ---------- Webhook processing (L2-05) ----------
  async handleWebhook(rawBody, headers) {
    const headerName = SIGNATURE_HEADERS[this.provider.name];
    const signature = headers[headerName];
    if (!signature || !this.provider.verifyWebhookSignature(rawBody, signature, headers)) {
      throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature verification failed.');
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      throw new AppError(400, 'INVALID_WEBHOOK_PAYLOAD', 'Webhook payload is not valid JSON.');
    }

    const attributes = (event.data && event.data.attributes) || {};
    const object = attributes.data || {};
    const parsed =
      this.provider.parseWebhook(event) || {
        eventId: (event.data && event.data.id) || `evt-${Date.now()}`,
        type: (event.data && event.data.type) || event.type || 'unknown',
        sessionId: object.id || attributes.checkout_session_id || '',
        reference: attributes.reference_number || '',
      };
    const { eventId, type } = parsed;

    // Idempotency: the unique index makes a replayed event a harmless no-op.
    try {
      await WebhookEvent.create({ provider: this.provider.name, eventId, type });
    } catch (e) {
      if (e.code === 11000) return { received: true, duplicate: true };
      throw e;
    }

    const order =
      (parsed.sessionId && (await Order.findOne({ 'payment.sessionId': parsed.sessionId }))) ||
      (parsed.reference && (await Order.findOne({ 'payment.reference': parsed.reference }))) ||
      null;

    if (!order) {
      await WebhookEvent.updateOne({ provider: this.provider.name, eventId }, { status: 'ignored' });
      return { received: true, ignored: true }; // unknown event types are acknowledged safely
    }

    if (type.includes('paid')) {
      await this.verifyAndMarkPaid(order);
    } else if (type.includes('expired')) {
      await this.expireOrder(order, 'webhook');
    } else if (type.includes('failed') || type.includes('cancelled') || type.includes('void')) {
      // Unhappy path (L2-07): release stock, keep the order retryable, never mark it paid.
      await this.inventory.releaseFor(order);
      logger.warn(`Payment ${type} for order ${order.orderNumber} - stock released, order remains ${order.status}`);
    }

    await WebhookEvent.updateOne({ provider: this.provider.name, eventId }, { status: 'processed' });
    return { received: true };
  }

  // ---------- Verification (L2-06 + S-08) ----------
  // Status, amount and currency are confirmed with the GATEWAY before an order is marked paid.
  async verifyAndMarkPaid(order) {
    if (order.status === 'paid') return { verified: true, alreadyPaid: true };
    if (!order.payment.sessionId) throw new AppError(409, 'NO_PAYMENT_SESSION', 'This order has no payment session to verify.');

    const gateway = await this.provider.retrievePayment(order.payment.sessionId);
    if (gateway.status !== 'paid') return { verified: false, gatewayStatus: gateway.status };

    const amountMatches = gateway.amountPaidCents === order.totalCents;
    const currencyMatches = gateway.currency === order.currency;
    if (!amountMatches || !currencyMatches) {
      order.payment.amountMismatch = true;
      order.payment.mismatchNote = `gateway reported ${gateway.amountPaidCents} ${gateway.currency}; order expects ${order.totalCents} ${order.currency}`;
      await order.save();
      logger.warn(`AMOUNT MISMATCH for ${order.orderNumber}: ${order.payment.mismatchNote} - NOT marking paid.`);
      return { verified: false, flagged: true };
    }

    await this.orders.transition(order, 'paid', 'webhook', `Verified with gateway (${gateway.amountPaidCents} ${gateway.currency})`);
    order.payment.paidAt = new Date();
    await order.save();
    await this.inventory.markConsumed(order);
    return { verified: true };
  }

  // Retrieve-on-return path: the success page calls this so a missed webhook can still
  // move the order to paid (reconciliation, L2-06).
  async statusForOwner(orderId, user) {
    const order = await Order.findById(orderId);
    if (!order || (!order.user.equals(user.id) && user.role !== 'admin')) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    if (order.status === 'paid') return { order, gateway: { status: 'paid', verified: true } };
    const result = await this.verifyAndMarkPaid(order);
    return { order, gateway: result };
  }

  // Admin reconciliation endpoint: same verification, forced by an administrator.
  async reconcile(orderId, adminUser) {
    return this.statusForOwner(orderId, { id: adminUser.id, role: 'admin' });
  }

  async expireOrder(order, actor) {
    if (order.status !== 'pending_payment') return order;
    await this.orders.transition(order, 'expired', actor, 'Payment window elapsed');
    await this.inventory.releaseFor(order);
    return order;
  }

  // Sweeper for orders whose customer never paid (L2-03 expiry).
  async expireStaleOrders() {
    const cutoff = new Date(Date.now() - 60 * 1000);
    const stale = await Order.find({ status: 'pending_payment', createdAt: { $lt: cutoff } }).limit(100);
    for (const order of stale) {
      try {
        await this.expireOrder(order, 'system');
      } catch (e) {
        logger.error(`Expiry sweep failed for ${order.orderNumber}: ${e.message}`);
      }
    }
    return stale.length;
  }
}

module.exports = { PaymentService };
