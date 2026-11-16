// Campus pickup slots (Level 3 feature 2). Capacity enforced atomically on booking.
const { mongoose } = require('../config/db');

const slotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    timeWindow: { type: String, required: true, trim: true }, // e.g. "09:00-11:00"
    capacity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger } },
    booked: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

slotSchema.index({ date: 1, timeWindow: 1 }, { unique: true });

module.exports = mongoose.models.PickupSlot || mongoose.model('PickupSlot', slotSchema);
