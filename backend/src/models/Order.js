const { mongoose } = require('../config/db');

const money = {
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: 'Money must be an integer amount in centavos.' },
};

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true, trim: true }, // copied snapshot: order history survives product edits
    author: { type: String, trim: true, default: '' },
    priceCents: { ...money, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['paymongo', 'maya', ''], default: '' },
    sessionId: { type: String, default: '', index: true },
    checkoutUrl: { type: String, default: '' },
    reference: { type: String, default: '', index: true },
    paidAt: { type: Date, default: null },
    amountMismatch: { type: Boolean, default: false },
    mismatchNote: { type: String, default: '' },
  },
  { _id: false }
);

// Order lifecycle state machine (L2-04). Documented in docs/business-rules.md.
const STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    method: { type: String, enum: ['pickup', 'delivery'], default: 'delivery' },
    pickupSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupSlot', default: null },
    shipping: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
    },
    subtotalCents: money,
    studentDiscountCents: { ...money, default: 0 },
    discountCents: { ...money, default: 0 },
    shippingFeeCents: { ...money, default: 0 },
    totalCents: money,
    currency: { type: String, default: 'PHP' },
    coupon: { code: { type: String, default: '' }, type: { type: String, default: '' }, value: { type: Number, default: 0 } },
    status: { type: String, enum: STATUSES, default: 'pending_payment', index: true },
    payment: { type: paymentSchema, default: () => ({}) },
    stockReleased: { type: Boolean, default: false }, // reserved stock returned exactly once (L2-03/L2-07)
    idempotencyKey: { type: String, default: null, index: true }, // unique sparse index below (L2-08)
  },
  { timestamps: true }
);

orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'payment.sessionId': 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
