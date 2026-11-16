// PRICING (L2-02): the client can never set prices or totals. Everything is recomputed here
// from database records in centavos, with one documented rounding rule (round to nearest centavo).
const env = require('../config/env');

class PricingService {
  // deps: { couponService } (composition)
  constructor({ couponService }) {
    this.couponService = couponService;
  }

  async compute({ user, lines, couponCode, method }) {
    const subtotalCents = lines.reduce((sum, l) => sum + l.product.priceCents * l.qty, 0);

    // Level 3 feature 1: verified students get an automatic discount (server-side rule).
    const isVerifiedStudent = Boolean(user && user.student && user.student.status === 'verified');
    const studentDiscountCents = isVerifiedStudent
      ? Math.round((subtotalCents * env.studentDiscountPercent) / 100)
      : 0;

    // Coupons are validated and computed against the amount AFTER the student discount.
    const baseCents = subtotalCents - studentDiscountCents;
    let coupon = null;
    let discountCents = 0;
    if (couponCode) {
      const result = await this.couponService.validateAndCompute(couponCode, baseCents, user);
      coupon = { id: result.coupon._id, code: result.coupon.code, type: result.coupon.type, value: result.coupon.value };
      discountCents = result.discountCents;
    }

    // Pickup at campus = no shipping fee (Level 3 rule).
    const shippingFeeCents = method === 'pickup' || subtotalCents === 0 ? 0 : env.shippingFeeCentavos;
    const totalCents = Math.max(0, subtotalCents - studentDiscountCents - discountCents + shippingFeeCents);

    return {
      subtotalCents,
      studentDiscountCents,
      discountCents,
      shippingFeeCents,
      totalCents,
      currency: 'PHP',
      studentDiscountApplied: isVerifiedStudent,
      coupon,
    };
  }
}

module.exports = { PricingService };
