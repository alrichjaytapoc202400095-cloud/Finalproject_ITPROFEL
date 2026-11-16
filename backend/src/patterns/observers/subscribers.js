// Subscribers registered once at startup. Each one reacts to order events
// without the order service knowing anything about them (Observer pattern).
// Adding a new listener (e.g. email sending) never changes the order service.
const bus = require('./orderEventBus');
const Notification = require('../../models/Notification');
const logger = require('../../utils/logger');

const STATUS_MESSAGES = {
  pending_payment: 'Your order is waiting for payment.',
  paid: 'Payment confirmed! Your order is being prepared.',
  processing: 'Your order is being processed.',
  shipped: 'Your order has shipped.',
  delivered: 'Your order was delivered. Thank you for shopping at SPC Book Store!',
  cancelled: 'Your order was cancelled and reserved items were returned to stock.',
  expired: 'Your unpaid order expired and reserved items were returned to stock.',
};

// Subscriber 1: customer notifications.
bus.on('order.statusChanged', async ({ order, to }) => {
  try {
    await Notification.create({
      user: order.user,
      type: 'order.statusChanged',
      message: `Order ${order.orderNumber}: ${STATUS_MESSAGES[to] || `status changed to ${to}`}`,
    });
  } catch (e) {
    logger.error(`Observer notification failed for ${order.orderNumber}: ${e.message}`);
  }
});

// Subscriber 2: stock-return notices when a reservation is released.
bus.on('reservation.released', async ({ order }) => {
  try {
    await Notification.create({
      user: order.user,
      type: 'reservation.released',
      message: `Order ${order.orderNumber}: reserved items were returned to stock.`,
    });
  } catch (e) {
    logger.error(`Observer notification failed for ${order.orderNumber}: ${e.message}`);
  }
});

module.exports = { STATUS_MESSAGES };
