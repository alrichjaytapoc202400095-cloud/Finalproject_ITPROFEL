// Coupon rules (L2-01): every check happens on the server and returns a specific error code.
const Coupon = require('../models/Coupon');
const CouponRedemption = require('../models/CouponRedemption');
const { AppError } = require('../utils/errors');
const { formatPeso } = require('../utils/money');
const strategySelector = require('../patterns/strategies/select'); // Strategy pattern

class CouponService {
  async validateAndCompute(code, baseAmountCents, user) {
    const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
    if (!coupon || !coupon.active) throw new AppError(422, 'COUPON_INVALID', 'That coupon code is not valid.');

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError(422, 'COUPON_EXPIRED', `That coupon expired on ${coupon.expiresAt.toISOString().slice(0, 10)}.`);
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(422, 'COUPON_EXHAUSTED', 'That coupon has reached its usage limit.');
    }
    if (baseAmountCents < coupon.minSpendCents) {
      throw new AppError(422, 'COUPON_MIN_SPEND', `That coupon requires a minimum spend of ${formatPeso(coupon.minSpendCents)}.`);
    }
    if (user) {
      const usedByCustomer = await CouponRedemption.countDocuments({ coupon: coupon._id, user: user.id });
      if (coupon.perCustomerLimit > 0 && usedByCustomer >= coupon.perCustomerLimit) {
        throw new AppError(422, 'COUPON_PER_USER_LIMIT', 'You have already used this coupon the maximum number of times.');
      }
    }

    const strategy = strategySelector.select(coupon); // percentage or fixed, selected at runtime
    const discountCents = strategy.apply(baseAmountCents);
    return { coupon, discountCents };
  }

  // Records one redemption per order (unique index) and bumps the usage counter.
  async redeem(order, couponId, userId) {
    const exists = await CouponRedemption.findOne({ coupon: couponId, order: order._id });
    if (exists) return;
    await CouponRedemption.create({ coupon: couponId, user: userId, order: order._id });
    await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
  }
}

module.exports = { CouponService };
