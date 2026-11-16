// PayMongo TEST mode provider (https://docs.paymongo.com).
// Amounts are sent/received in centavos; authentication is Basic base64(secretKey:).
const crypto = require('crypto');
const { PaymentProvider } = require('./PaymentProvider');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const API_BASE = 'https://api.paymongo.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

class PayMongoProvider extends PaymentProvider {
  constructor() {
    super();
    if (!env.paymongoSecretKey) logger.warn('PAYMONGO_SECRET_KEY is not set - checkout creation will fail until configured.');
  }

  get name() {
    return 'paymongo';
  }

  authHeader() {
    return `Basic ${Buffer.from(`${env.paymongoSecretKey}:`).toString('base64')}`;
  }

  async request(path, method, body) {
    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new AppError(502, 'GATEWAY_UNAVAILABLE', 'The payment gateway could not be reached. Please try again shortly.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = json && json.errors && json.errors[0] ? json.errors[0].detail : '';
      throw new AppError(502, 'GATEWAY_ERROR', `The payment gateway rejected the request. ${detail}`.trim());
    }
    return json;
  }

  async createCheckoutSession(order) {
    const lineItems = order.items.map((i) => ({
      currency: 'PHP',
      amount: i.priceCents,
      description: i.author ? `by ${i.author}` : 'SPC Book Store item',
      name: i.title,
      quantity: i.qty,
    }));
    const successUrl = `${env.frontendUrl}/orders?paid=1&order=${order.orderNumber}`;
    const cancelUrl = `${env.frontendUrl}/orders?canceled=1&order=${order.orderNumber}`;
    const json = await this.request('/checkout_sessions', 'POST', {
      data: {
        attributes: {
          line_items: lineItems,
          payment_method_types: ['card', 'gcash', 'paymaya'],
          send_email_receipt: false,
          success_url: successUrl,
          cancel_url: cancelUrl,
          reference_number: order.orderNumber,
          description: `SPC Book Store order ${order.orderNumber}`,
        },
      },
    });
    const attrs = json.data.attributes;
    return {
      provider: this.name,
      sessionId: json.data.id,
      checkoutUrl: attrs.redirect && attrs.redirect.checkout_url ? attrs.redirect.checkout_url : attrs.checkout_url,
      reference: order.orderNumber,
    };
  }

  async retrievePayment(sessionId) {
    const json = await this.request(`/checkout_sessions/${encodeURIComponent(sessionId)}`, 'GET');
    const attrs = json.data.attributes || {};
    let amountPaidCents = attrs.amount || 0;
    if (Array.isArray(attrs.payments) && attrs.payments[0] && attrs.payments[0].data) {
      amountPaidCents = attrs.payments[0].data.attributes.amount;
    }
    return { status: attrs.status, amountPaidCents, currency: 'PHP' };
  }

  // Normalizes PayMongo's webhook envelope into the shared shape.
  parseWebhook(event = {}) {
    const attributes = (event.data && event.data.attributes) || {};
    const object = attributes.data || {};
    return {
      eventId: (event.data && event.data.id) || `evt-${Date.now()}`,
      type: (event.data && event.data.type) || event.type || 'unknown',
      sessionId: object.id || attributes.checkout_session_id || '',
      reference: attributes.reference_number || '',
    };
  }

  // PayMongo signs `t.<rawBody>` with the webhook secret and sends it in the Paymongo-Signature header:
  // e.g. "t=1699999999,test=9f2a...,live=...". We recompute HMAC-SHA256 and compare (S-07).
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!signatureHeader || !env.paymongoWebhookSecret) return false;
    let timestamp = null;
    const candidates = [];
    for (const part of String(signatureHeader).split(',')) {
      const [key, value] = part.split('=');
      if (!key || !value) continue;
      if (key.trim() === 't') timestamp = value.trim();
      else if (key.trim() === 'test' || key.trim() === 'live') candidates.push(value.trim());
    }
    if (!timestamp || candidates.length === 0) return false;
    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (Number.isNaN(age) || age > SIGNATURE_TOLERANCE_SECONDS) return false;
    const expected = crypto
      .createHmac('sha256', env.paymongoWebhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    return candidates.some((candidate) => candidate.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected)));
  }
}

module.exports = { PayMongoProvider };
