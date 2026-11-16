// Gateway events are stored with a unique event id (L2-05): replaying a webhook is a no-op.
const { mongoose } = require('../config/db');

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    type: { type: String, default: '' },
    status: { type: String, enum: ['received', 'ignored', 'processed'], default: 'received' },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);
