// ABSTRACT BASE CLASS (T-16): defines the contract every payment provider must fulfill.
// It cannot be instantiated directly, and every operation throws if a subclass forgets it.
class PaymentProvider {
  constructor() {
    if (new.target === PaymentProvider) {
      throw new Error('PaymentProvider is abstract and cannot be instantiated directly. Use PaymentProviderFactory.');
    }
  }

  get name() {
    return 'base';
  }

  // Creates a hosted checkout session for an order. Returns { provider, sessionId, checkoutUrl, reference }.
  // eslint-disable-next-line no-unused-vars
  async createCheckoutSession(order) {
    throw new Error(`createCheckoutSession() is not implemented by ${this.constructor.name}`);
  }

  // Asks the gateway for the payment's current status. Returns { status, amountPaidCents, currency }.
  // eslint-disable-next-line no-unused-vars
  async retrievePayment(reference) {
    throw new Error(`retrievePayment() is not implemented by ${this.constructor.name}`);
  }

  // Verifies the webhook signature over the RAW request body. Returns true/false (S-07).
  // `headers` is passed so providers that sign extra headers (Maya timestamp) can use them.
  // eslint-disable-next-line no-unused-vars
  verifyWebhookSignature(rawBody, signatureHeader, headers) {
    throw new Error(`verifyWebhookSignature() is not implemented by ${this.constructor.name}`);
  }

  // Normalizes a provider-specific webhook payload into { eventId, type, sessionId, reference }.
  // Providers may override this; the base implementation returns null (fall back to legacy parsing).
  // eslint-disable-next-line no-unused-vars
  parseWebhook(event) {
    return null;
  }
}

module.exports = { PaymentProvider };
