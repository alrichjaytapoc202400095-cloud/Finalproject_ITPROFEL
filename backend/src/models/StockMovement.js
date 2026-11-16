// Inventory audit: every stock change with previous/new values, reason and actor (L1-10).
const { mongoose } = require('../config/db');

const movementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    delta: { type: Number, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

movementSchema.index({ product: 1, at: -1 });

module.exports = mongoose.models.StockMovement || mongoose.model('StockMovement', movementSchema);
