// Audit trail: every status transition with actor and timestamp (L1-11 / L2-04).
const { mongoose } = require('../config/db');

const historySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    actor: { type: String, required: true }, // userId, 'system', 'webhook'
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

historySchema.index({ order: 1, at: 1 });

module.exports = mongoose.models.OrderStatusHistory || mongoose.model('OrderStatusHistory', historySchema);
