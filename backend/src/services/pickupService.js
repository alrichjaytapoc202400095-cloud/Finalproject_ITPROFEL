// Pickup slot rules (Level 3 feature 2): capacity is enforced atomically on booking.
const PickupSlot = require('../models/PickupSlot');
const { AppError } = require('../utils/errors');

class PickupService {
  async listPublic() {
    const today = new Date().toISOString().slice(0, 10);
    const slots = await PickupSlot.find({ isActive: true, date: { $gte: today } }).sort({ date: 1, timeWindow: 1 });
    return slots.map((s) => ({ ...s.toObject(), remaining: Math.max(0, s.capacity - s.booked) }));
  }

  async adminList() {
    return PickupSlot.find().sort({ date: -1, timeWindow: 1 });
  }

  async create({ date, timeWindow, capacity }) {
    const duplicate = await PickupSlot.findOne({ date, timeWindow });
    if (duplicate) throw new AppError(409, 'SLOT_EXISTS', 'A slot for that date and time window already exists.');
    return PickupSlot.create({ date, timeWindow, capacity, booked: 0 });
  }

  async update(id, { capacity, isActive }) {
    const slot = await PickupSlot.findById(id);
    if (!slot) throw new AppError(404, 'SLOT_NOT_FOUND', 'Pickup slot not found.');
    if (capacity !== undefined) slot.capacity = capacity;
    if (isActive !== undefined) slot.isActive = isActive;
    await slot.save();
    return slot;
  }

  async remove(id) {
    const slot = await PickupSlot.findById(id);
    if (!slot) throw new AppError(404, 'SLOT_NOT_FOUND', 'Pickup slot not found.');
    slot.isActive = false;
    await slot.save();
    return slot;
  }

  // Atomic booking: the $expr condition guarantees booked < capacity inside one database operation,
  // so two customers can never take the same last slot.
  async book(slotId) {
    const slot = await PickupSlot.findOneAndUpdate(
      { _id: slotId, isActive: true, $expr: { $lt: ['$booked', '$capacity'] } },
      { $inc: { booked: 1 } },
      { new: true }
    );
    if (!slot) {
      const exists = await PickupSlot.findById(slotId);
      if (!exists) throw new AppError(404, 'SLOT_NOT_FOUND', 'Pickup slot not found.');
      throw new AppError(409, 'PICKUP_SLOT_FULL', 'That pickup slot is already full. Please choose another.');
    }
    return slot;
  }

  async release(slotId) {
    await PickupSlot.findOneAndUpdate({ _id: slotId, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
  }
}

module.exports = { PickupService };
