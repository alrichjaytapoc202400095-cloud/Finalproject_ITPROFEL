// Inventory reservation (L2-03): stock is decremented ATOMICALLY at checkout.
// A conditional findOneAndUpdate means two simultaneous checkouts for the last unit
// produce exactly one success and one clear failure.
const Product = require('../models/Product');
const Reservation = require('../models/Reservation');
const { AppError } = require('../utils/errors');
const env = require('../config/env');
const bus = require('../patterns/observers/orderEventBus');
const pickupService = require('./pickupService');

class InventoryService {
  // Takes stock out of the catalog and records a reservation with an expiry.
  async reserveFor(orderId, lines) {
    const decremented = []; // for rollback if a later line fails
    try {
      for (const { product, qty } of lines) {
        const updated = await Product.findOneAndUpdate(
          { _id: product._id, isActive: true, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true }
        );
        if (!updated) {
          throw new AppError(409, 'OUT_OF_STOCK', `Only ${product.stock} left in stock for "${product.title}".`);
        }
        decremented.push({ productId: product._id, qty });
      }
      const expiresAt = new Date(Date.now() + env.orderExpiryMinutes * 60 * 1000);
      await Reservation.insertMany(
        lines.map(({ product, qty }) => ({ order: orderId, product: product._id, qty, expiresAt }))
      );
      return lines;
    } catch (e) {
      // Roll back any stock we already took so failed checkouts never leak stock.
      for (const d of decremented) await Product.updateOne({ _id: d.productId }, { $inc: { stock: d.qty } });
      throw e;
    }
  }

  // Releases reserved stock + pickup slot. Guarded by order.stockReleased so it can never run twice.
  async releaseFor(order) {
    if (order.stockReleased) return { alreadyReleased: true };
    const reservations = await Reservation.find({ order: order._id, released: false });
    for (const r of reservations) {
      await Product.updateOne({ _id: r.product }, { $inc: { stock: r.qty } });
      r.released = true;
      await r.save();
    }
    if (order.method === 'pickup' && order.pickupSlot) await pickupService.release(order.pickupSlot);
    order.stockReleased = true;
    await order.save();
    bus.emit('reservation.released', { order });
    return { released: reservations.length };
  }

  // Bookkeeping only (stock was already sold) - used when an order is paid.
  async markConsumed(order) {
    await Reservation.updateMany({ order: order._id, released: false }, { released: true });
  }
}

module.exports = { InventoryService };
