// Runtime selection of the discount strategy for a coupon (Strategy pattern).
const { PercentageDiscountStrategy, FixedDiscountStrategy } = require('./DiscountStrategy');

function select(coupon) {
  if (coupon.type === 'percentage') return new PercentageDiscountStrategy(coupon.value);
  if (coupon.type === 'fixed') return new FixedDiscountStrategy(coupon.value);
  throw new Error(`No discount strategy for coupon type "${coupon.type}"`);
}

module.exports = { select };
