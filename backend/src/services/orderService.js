// ORDER LIFECYCLE (L2-04): a documented state machine. Illegal transitions return 409.
// Every transition is recorded in OrderStatusHistory with actor and timestamp.
const Order = require('../models/Order');
const OrderStatusHistory = require('../models/OrderStatusHistory');
const { AppError } = require('../utils/errors');
const bus = require('../patterns/observers/orderEventBus');
const { newOrderNumber } = require('../utils/orderNumber');

// pending_payment -> paid | cancelled | expired
// paid -> processing -> shipped -> delivered
const TRANSITIONS = {
  pending_payment: ['paid', 'cancelled', 'expired'],
  paid: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  expired: [],
};

class OrderService {
  get transitions() {
    return TRANSITIONS;
  }

  // The ONLY place order status is mutated (encapsulation: routes never touch status directly).
  async transition(order, to, actor, note = '') {
    const allowed = TRANSITIONS[order.status] || [];
    if (!allowed.includes(to)) {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', `An order cannot go from "${order.status}" to "${to}".`);
    }
    const from = order.status;
    order.status = to;
    await order.save();
    await OrderStatusHistory.create({ order: order._id, from, to, actor, note });
    bus.emit('order.statusChanged', { order, from, to, actor, note }); // Observer: subscribers react
    return order;
  }

  async create(doc) {
    return Order.create({ ...doc, orderNumber: newOrderNumber() });
  }

  async listMine(user, { page = 1, limit = 10, status } = {}) {
    const query = { user: user.id };
    if (status) query.status = status;
    const lim = Math.min(Number(limit) || 10, 50);
    const pg = Math.max(Number(page) || 1, 1);
    const [items, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
      Order.countDocuments(query),
    ]);
    return { items, meta: { total, page: pg, limit: lim, pages: Math.ceil(total / lim) || 1 } };
  }

  // Customers may only read their own orders: another customer's order is 404 (no data leak).
  async getForCustomer(user, orderId) {
    const order = await Order.findOne({ _id: orderId, user: user.id });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    const history = await OrderStatusHistory.find({ order: order._id }).sort({ at: 1 });
    return { order, history };
  }

  async getById(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    return order;
  }

  async cancelByCustomer(user, orderId) {
    const order = await Order.findOne({ _id: orderId, user: user.id });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    // The state machine rejects cancelling a paid order with 409.
    const cancelled = await this.transition(order, 'cancelled', user.id, 'Cancelled by customer');
    return cancelled;
  }

  async adminList({ status, from, to, page = 1, limit = 20 } = {}) {
    const query = {};
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const lim = Math.min(Number(limit) || 20, 100);
    const pg = Math.max(Number(page) || 1, 1);
    const [items, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
      Order.countDocuments(query),
    ]);
    return { items, meta: { total, page: pg, limit: lim } };
  }

  async adminSetStatus(orderId, to, adminUser) {
    const order = await this.getById(orderId);
    return this.transition(order, to, adminUser.id, 'Updated by administrator');
  }
}

module.exports = { OrderService, TRANSITIONS };
