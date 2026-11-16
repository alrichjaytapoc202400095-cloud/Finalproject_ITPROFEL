// CHECKOUT (L1-06): the Façade for placing an order.
// COMPOSITION (T-18): this service is assembled from collaborators -
// pricing, coupons, inventory, pickup slots, the cart and the payment provider -
// instead of inheriting any of them. Routes call one method; the details stay in here.
const Order = require('../models/Order');
const Product = require('../models/Product');
const { AppError } = require('../utils/errors');

class CheckoutService {
  // deps: { pricingService, inventoryService, pickupService, couponService, cartService, paymentProvider }
  constructor(deps) {
    this.pricing = deps.pricingService;
    this.inventory = deps.inventoryService;
    this.pickups = deps.pickupService;
    this.coupons = deps.couponService;
    this.carts = deps.cartService;
    this.paymentProvider = deps.paymentProvider;
  }

  // Full checkout flow:
  //   idempotency -> lines -> pricing -> order -> reserve stock -> book slot -> payment session
  async placeOrder(user, body, idempotencyKey) {
    // Idempotency (L2-08): repeating the same key returns the SAME order instead of a new one.
    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey, user: user.id });
      if (existing) return { order: existing, replayed: true };
    }

    const lines = await this.resolveLines(user, body);
    const method = body.method; // 'pickup' | 'delivery' (validated by middleware)

    // Pickup slots (Level 3 feature 2): pickup orders must claim a slot with remaining capacity.
    let pickupSlotId = null;
    if (method === 'pickup') {
      if (!body.pickupSlotId) throw new AppError(422, 'PICKUP_SLOT_REQUIRED', 'Please choose a campus pickup slot.');
      const slot = await this.pickups.listPublic().then((all) => all.find((s) => s._id.toString() === body.pickupSlotId));
      if (!slot) throw new AppError(404, 'SLOT_NOT_FOUND', 'Pickup slot not found or no longer available.');
      if (slot.remaining < 1) throw new AppError(409, 'PICKUP_SLOT_FULL', 'That pickup slot is already full.');
      pickupSlotId = slot._id;
    }

    const shipping = {
      name: String((body.shipping && body.shipping.name) || user.name).trim(),
      phone: String((body.shipping && body.shipping.phone) || '').trim(),
      address: method === 'delivery' ? String((body.shipping && body.shipping.address) || '').trim() : 'Campus pickup',
    };
    if (!shipping.name || !shipping.phone) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Please provide a contact name and phone number.');
    }
    if (method === 'delivery' && !shipping.address) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Please provide a delivery address.');
    }

    // Server-side pricing (L2-02): client-sent prices/totals are ignored entirely.
    const student = await this.userStudent(user.id);
    const pricing = await this.pricing.compute({
      user: { id: user.id, student },
      lines,
      couponCode: body.couponCode,
      method,
    });

    // 1) Create the order first (status pending_payment), then take real resources.
    const order = await Order.create({
      orderNumber: `SPC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      user: user.id,
      items: lines.map((l) => ({
        product: l.product._id,
        title: l.product.title,
        author: l.product.author || '',
        priceCents: l.product.priceCents,
        qty: l.qty,
      })),
      method,
      pickupSlot: pickupSlotId,
      shipping,
      subtotalCents: pricing.subtotalCents,
      studentDiscountCents: pricing.studentDiscountCents,
      discountCents: pricing.discountCents,
      shippingFeeCents: pricing.shippingFeeCents,
      totalCents: pricing.totalCents,
      currency: pricing.currency,
      coupon: pricing.coupon ? { code: pricing.coupon.code, type: pricing.coupon.type, value: pricing.coupon.value } : { code: '', type: '', value: 0 },
      idempotencyKey: idempotencyKey || null,
      status: 'pending_payment',
    });

    // 2) Atomic stock reservation (L2-03) and atomic slot booking (Level 3 feature 2).
    try {
      await this.inventory.reserveFor(order._id, lines);
      if (pickupSlotId) await this.pickups.book(pickupSlotId);
    } catch (e) {
      await Order.deleteOne({ _id: order._id }); // reserveFor already rolled its own stock back
      throw e;
    }

    // 3) Payment session through the backend (L1-08): the frontend never sees the secret key.
    let session;
    try {
      session = await this.paymentProvider.createCheckoutSession(order);
    } catch (e) {
      await this.inventory.releaseFor(order); // restore stock + pickup slot
      await Order.deleteOne({ _id: order._id });
      throw e; // 502 GATEWAY_UNAVAILABLE - the customer can simply retry checkout
    }

    order.payment = {
      provider: session.provider,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      reference: session.reference,
    };
    await order.save();

    // 4) Record coupon usage once the order is safely placed.
    if (pricing.coupon && pricing.coupon.id) {
      await this.coupons.redeem(order, pricing.coupon.id, user.id);
    }

    return { order, checkoutUrl: session.checkoutUrl, replayed: false };
  }

  // Retry payment for an order whose session expired or whose webhook was missed (L2-07).
  async retryPayment(user, orderId) {
    const order = await Order.findOne({ _id: orderId, user: user.id });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (order.status !== 'pending_payment') {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Only unpaid orders can be paid again (current status: ${order.status}).`);
    }
    const session = await this.paymentProvider.createCheckoutSession(order);
    order.payment.provider = session.provider;
    order.payment.sessionId = session.sessionId;
    order.payment.checkoutUrl = session.checkoutUrl;
    order.payment.reference = session.reference;
    await order.save();
    return { order, checkoutUrl: session.checkoutUrl };
  }

  // Turns the request into authoritative catalog lines [{ product, qty }].
  // Explicit items (tamper test) and cart items (normal flow) both go through the database.
  async resolveLines(user, body) {
    if (Array.isArray(body.items) && body.items.length > 0) {
      const lines = [];
      for (const item of body.items) {
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'One of the products is unavailable.');
        if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
          throw new AppError(422, 'VALIDATION_ERROR', 'Quantity must be a whole number between 1 and 99.');
        }
        this.carts.assertPurchasable(product); // pre-order release rule
        lines.push({ product, qty: item.qty });
      }
      return lines;
    }
    const cart = await this.carts.getCart(user.id);
    if (!cart.items.length) throw new AppError(422, 'EMPTY_CHECKOUT', 'Your cart is empty.');
    const lines = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) throw new AppError(422, 'PRODUCT_UNAVAILABLE', `"${item.title}" is no longer available.`);
      this.carts.assertPurchasable(product);
      if (product.stock < item.qty) {
        throw new AppError(409, 'OUT_OF_STOCK', `Only ${product.stock} left in stock for "${product.title}".`);
      }
      lines.push({ product, qty: item.qty });
    }
    return lines;
  }

  async userStudent(userId) {
    const User = require('../models/User');
    const u = await User.findById(userId).select('student');
    return u ? u.student : null;
  }
}

module.exports = { CheckoutService };
