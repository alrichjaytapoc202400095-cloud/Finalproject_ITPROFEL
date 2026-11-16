const { mongoose } = require('../config/db');

const money = {
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: 'Money must be an integer amount in centavos.' },
};

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 30 },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    // percentage: 1-100 | fixed: centavos
    value: { type: Number, required: true, min: 1 },
    minSpendCents: { ...money, default: 0 },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number, min: 0, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, min: 0, default: 0 },
    perCustomerLimit: { type: Number, min: 0, default: 1 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
