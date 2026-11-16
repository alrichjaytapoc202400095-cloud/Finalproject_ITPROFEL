// STRATEGY (B.5.3): interchangeable discount algorithms selected at runtime by coupon type.
class DiscountStrategy {
  // eslint-disable-next-line no-unused-vars
  apply(amountCents) {
    throw new Error(`apply() is not implemented by ${this.constructor.name}`);
  }

  cap(amountCents, discountCents) {
    return Math.max(0, Math.min(discountCents, amountCents)); // a discount can never exceed the subtotal
  }
}

class PercentageDiscountStrategy extends DiscountStrategy {
  constructor(percent) {
    super();
    this.percent = percent; // 1..100
  }

  apply(amountCents) {
    return this.cap(amountCents, Math.round((amountCents * this.percent) / 100));
  }
}

class FixedDiscountStrategy extends DiscountStrategy {
  constructor(cents) {
    super();
    this.cents = cents; // centavos off
  }

  apply(amountCents) {
    return this.cap(amountCents, this.cents);
  }
}

module.exports = { DiscountStrategy, PercentageDiscountStrategy, FixedDiscountStrategy };
