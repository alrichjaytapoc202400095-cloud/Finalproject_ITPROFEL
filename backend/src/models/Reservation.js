// Reservation record (L2-03): stock decremented atomically at checkout; released on failure/cancel/expiry.
const { mongoose } = require('../config/db');

const reservationSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true },
    released: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);
