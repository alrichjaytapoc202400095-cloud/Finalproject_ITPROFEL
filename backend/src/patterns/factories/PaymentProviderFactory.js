// FACTORY METHOD (B.5.3): the rest of the system asks for "a payment provider"
// and never knows which concrete class it received. Adding Maya took one case + one file.
const { PayMongoProvider } = require('../providers/PayMongoProvider');
const { MayaProvider } = require('../providers/MayaProvider');
const { AppError } = require('../../utils/errors');
const env = require('../../config/env');

const providers = { paymongo: PayMongoProvider, maya: MayaProvider };

class PaymentProviderFactory {
  static create(name = env.paymentProvider) {
    const Provider = providers[name];
    if (!Provider) {
      throw new AppError(500, 'CONFIG_ERROR', `Unknown PAYMENT_PROVIDER "${name}". Use one of: ${Object.keys(providers).join(', ')}.`);
    }
    return new Provider();
  }
}

module.exports = { PaymentProviderFactory };
