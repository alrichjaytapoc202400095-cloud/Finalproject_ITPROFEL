// Records that a customer used a coupon on an order - enforces per-customer limits.
const { mongoose } = require('../config/db');

const redemptionSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  },
  { timestamps: true }
);

redemptionSchema.index({ coupon: 1, user: 1 });
redemptionSchema.index({ coupon: 1, order: 1 }, { unique: true }); // one redemption row per order+coupon

module.exports = mongoose.models.CouponRedemption || mongoose.model('CouponRedemption', redemptionSchema);
