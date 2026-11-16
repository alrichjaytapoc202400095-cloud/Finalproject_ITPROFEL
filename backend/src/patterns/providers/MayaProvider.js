// Maya Checkout provider (https://developers.maya.ph). Selected with PAYMENT_PROVIDER=maya.
// Implemented to the same contract as PayMongoProvider so the factory can swap them polymorphically.
// NOTE: Maya amounts are decimal pesos (not centavos), so we convert at the boundary.
const crypto = require('crypto');
const { PaymentProvider } = require('./PaymentProvider');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const { fromCents } = require('../../utils/money');
const logger = require('../../utils/logger');

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

// Published by Maya for Webhook Signature Version 1 (see docs: Webhook Security).
// They are public keys, safe to keep in source. Override with MAYA_WEBHOOK_PUBLIC_KEYS
// if Maya rotates them before this code is updated.
const SANDBOX_WEBHOOK_KEYS = [
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjNkSX6p+goDPaPAYuTzT
zKTCBeLhh8FkPMbZxDKTUxF93dOwiC7jsdx7KyopupeLosiVlbs+gpAJ7XBQP/Ex
giyzXC9TljpyvkUQfyRPMAMKq+BzxdUliTl6hgrLBsH28CP5FuPHCsfxDXe7mDtv
9H4mP3SKO0HfkZ45tudxD9CWbwWKF0lU9LRbLlJ0y7KEaK7Rv9fI1Dp/KPT+9pls
tU+CPNKaxJjGRKGuxW2AOCabSD0cTZNXki+K51mNoma7Mj1HMhnsR68FGJvCqk1q
Wsr3q8+EUMVPBMX+5nKATfZYGvxg4ytzT8pnEVeWl6phYKviB9aVVwurh1gDJB4r
lQIDAQAB
-----END PUBLIC KEY-----`,
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp14gezqq4dGWu7EZ7BHx
8wD3y1hqxwQR7UYPXtXJP+WngN4wqwatjsnQaRGnmdPRG8VEzUzw9PlR7t7P24uW
+J08xBrtTVouD2MKglcIcy13rt1XL79zr/LIAFMFI6f4O8/OQi1xsGsZ6xarD+wl
OQKG4W66I3yp2jNAbge25eSPuo0BNqPWvebMcIYJu4f3Fxu1eDgeM6zCEqLc6+jX
cNTP/zFHCvQaiIlLOqfgXDRPBcHPPZ2qcB99UVPAHXBKsKdtBB2w2qT2l99MlTAB
iRy+IKtVQcQyRP7T8blegO25x35G2CZ3VCKPkmUen3eXQ4+r5fVlzEIBSfNvBwT9
jQIDAQAB
-----END PUBLIC KEY-----`,
];

const PRODUCTION_WEBHOOK_KEYS = [
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjCGhkjg1PQe0WVHCYdTT
2luqzXhKfeStALWlEcMpHqYusd6dAU4vZ9bGQns/OYe/H2cIxEPvRJnRcipMKvVZ
pzAFEKHQLiXdeuNcxkAaxEZEwMAmFdVGmNLZbpi579r2s6Q++zYy0OHb9awY/2z0
OYRwV5XN7SCrqIlf1tEHfxKV2cJDCFW030nnRMoWisQ9KXG3Ihvjj4tOQimPCtzp
SDtlf6QFmg/WZBIOEdLro9oROztK6PwrI/yG5ZFaUCQYfY8fw0y1/PI3heEf8z5k
xA466LdSqCeVdGwfjKy9ZHown8XiiPI82HnBrMP3UPX4efEfopbP4SpDFOEwRNA9
FQIDAQAB
-----END PUBLIC KEY-----`,
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxZJxNmpNYjxFCBa2P6Ad
wzDDuDKOKAgiTBrQvJGuX/l2u32N4d4FYw99md16rf1iIcxD70/KG9nWrltrxbIs
bm9+bCHVLKMfdjaJQCBGXN/WW6W1XaGQQPft9UlmAwA/uMKTsN/2XqFjoKSJoe9e
Xz/p3pGn66oBTCwvzDqma46GxF92atiOt6CEcRl8P+dDKJlYY7fcxiuNMeDMOOla
KMxUz9nMgJ6uESK/kS8C8+hGuiCWgKeIRm/ONL5Gk/lypWzrphaKcWqpBGZxpNAL
AVmPY9ke4+RxyojkEre4d5sT2C21oAQVHyGewd0ttQ/bK59X17+yg5FOfRpI1BKj
7wIDAQAB
-----END PUBLIC KEY-----`,
];

// Maya's Webhook Signature v1 signs a lexicographically sorted, flattened payload
// plus the nonce. Nested objects become dot paths and arrays numeric indices.
function flatten(value, prefix = '', out = []) {
  if (value === null || value === undefined || value === '') return out;
  if (Array.isArray(value) && value.length === 0) return out;
  if (typeof value === 'object' && Object.keys(value).length === 0) return out;
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.push(`${prefix}=${String(value)}`);
  return out;
}

function webhookPublicKeys() {
  if (env.mayaWebhookPublicKeys.length > 0) return env.mayaWebhookPublicKeys;
  return env.mayaBaseUrl.includes('sandbox') ? SANDBOX_WEBHOOK_KEYS : PRODUCTION_WEBHOOK_KEYS;
}

class MayaProvider extends PaymentProvider {
  constructor() {
    super();
    if (!env.mayaPublicKey || !env.mayaSecretKey) {
      logger.warn('MAYA_PUBLIC_KEY / MAYA_SECRET_KEY are not set - Maya checkout creation will fail until configured.');
    }
  }

  get name() {
    return 'maya';
  }

  authHeader(key) {
    return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
  }

  async request(path, method, key, body) {
    let res;
    try {
      res = await fetch(`${env.mayaBaseUrl}${path}`, {
        method,
        headers: { Authorization: this.authHeader(key), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new AppError(502, 'GATEWAY_UNAVAILABLE', 'The payment gateway could not be reached. Please try again shortly.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AppError(502, 'GATEWAY_ERROR', 'The payment gateway rejected the request.');
    }
    return json;
  }

  async createCheckoutSession(order) {
    const successUrl = `${env.frontendUrl}/orders?paid=1&order=${order.orderNumber}`;
    const cancelUrl = `${env.frontendUrl}/orders?canceled=1&order=${order.orderNumber}`;
    const body = {
      totalAmount: { currency: 'PHP', value: Number(fromCents(order.totalCents).toFixed(2)) },
      requestReferenceNumber: order.orderNumber,
      redirectUrl: { success: successUrl, failure: cancelUrl, cancel: cancelUrl },
      items: order.items.map((i) => ({
        name: i.title,
        quantity: String(i.qty),
        totalAmount: { value: Number((fromCents(i.priceCents) * i.qty).toFixed(2)) },
      })),
    };
    // Create Checkout authenticates with the PUBLIC key (Maya docs: Create Checkout).
    const json = await this.request('/checkout/v1/checkouts', 'POST', env.mayaPublicKey, body);
    return {
      provider: this.name,
      sessionId: json.checkoutId,
      checkoutUrl: json.redirectUrl,
      reference: order.orderNumber,
    };
  }

  async retrievePayment(checkoutId) {
    // Retrieve Checkout authenticates with the SECRET key (Maya docs: Retrieve Checkout Info).
    const json = await this.request(`/checkout/v1/checkouts/${encodeURIComponent(checkoutId)}`, 'GET', env.mayaSecretKey);
    const statusMap = {
      COMPLETED: 'paid',
      PAYMENT_SUCCESS: 'paid',
      PAYMENT_FAILED: 'failed',
      PAYMENT_EXPIRED: 'expired',
      PAYMENT_CANCELLED: 'cancelled',
      EXPIRED: 'expired',
      CREATED: 'pending',
      PROCESSING: 'pending',
      PENDING_PAYMENT: 'pending',
      PAYMENT_PROCESSING: 'pending',
      AUTHORIZED: 'pending',
    };
    const rawStatus = json.paymentStatus || json.status || '';
    const total = json.totalAmount || {};
    const amountValue = total.value !== undefined ? total.value : total.amount;
    return {
      status: statusMap[rawStatus] || 'pending',
      amountPaidCents: amountValue !== undefined ? Math.round(Number(amountValue) * 100) : 0,
      currency: total.currency || 'PHP',
    };
  }

  // Normalizes Maya's webhook payload (the GET Payment response) into the same
  // shape PaymentService uses for every provider.
  parseWebhook(event = {}) {
    const status = event.paymentStatus || event.status || 'unknown';
    const typeMap = {
      PAYMENT_SUCCESS: 'paid',
      PAYMENT_FAILED: 'failed',
      PAYMENT_EXPIRED: 'expired',
      PAYMENT_CANCELLED: 'cancelled',
      AUTHORIZED: 'authorized',
    };
    const reference =
      event.requestReferenceNumber ||
      (event.metadata && event.metadata.requestReferenceNumber) ||
      '';
    return {
      // A payment can move through more than one status, so include the status
      // in the event id: retries dedupe, status changes still process.
      eventId: `${event.id || 'evt'}:${status}`,
      type: typeMap[status] || String(status).toLowerCase(),
      sessionId: event.checkoutId || '',
      reference,
    };
  }

  // Webhook Signature Version 1: RSA-SHA256 over the sorted flattened payload
  // plus the nonce. Headers: X-Maya-Webhook-Signature + X-Maya-Webhook-Timestamp (ms).
  verifyWebhookSignature(rawBody, signatureHeader, headers = {}) {
    if (!signatureHeader) return false;

    const parts = {};
    for (const segment of String(signatureHeader).split(',')) {
      const index = segment.indexOf('=');
      if (index < 0) continue;
      parts[segment.slice(0, index).trim()] = segment.slice(index + 1).trim();
    }
    const nonce = parts.nonce;
    const signature = parts.v1;
    if (!nonce || !signature) return false;

    const timestamp = Number(headers['x-maya-webhook-timestamp']);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > TIMESTAMP_TOLERANCE_MS) return false;

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return false;
    }

    const verifyString = `${flatten(payload).sort().join('&')}&nonce=${nonce}`;
    return webhookPublicKeys().some((publicKey) => {
      try {
        return crypto.createVerify('RSA-SHA256').update(verifyString).verify(publicKey, signature, 'hex');
      } catch {
        return false;
      }
    });
  }
}

module.exports = { MayaProvider };
