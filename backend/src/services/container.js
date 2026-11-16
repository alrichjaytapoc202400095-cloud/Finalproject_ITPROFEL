// COMPOSITION ROOT (T-18): services are wired together here, once.
// Every collaborator is injected as a "has-a" dependency - no service inherits another.
const { PaymentProviderFactory } = require('../patterns/factories/PaymentProviderFactory');
const { AIProxy, MAX_INPUT_CHARS } = require('../patterns/proxy/AIProxy');
const { GeminiClient } = require('../patterns/proxy/GeminiClient');

const { AuthService } = require('./authService');
const { ProductService } = require('./productService');
const { CartService } = require('./cartService');
const { CouponService } = require('./couponService');
const { PickupService } = require('./pickupService');
const { InventoryService } = require('./inventoryService');
const { PricingService } = require('./pricingService');
const { CheckoutService } = require('./checkoutService');
const { PaymentService } = require('./paymentService');
const { OrderService } = require('./orderService');
const { AdminService } = require('./adminService');
const { AIService } = require('./aiService');

// Creational pattern: which concrete provider is used is decided here, nowhere else.
const paymentProvider = PaymentProviderFactory.create();

const authService = new AuthService();
const productService = new ProductService();
const cartService = new CartService();
const couponService = new CouponService();
const pickupService = new PickupService();
const inventoryService = new InventoryService();
const pricingService = new PricingService({ couponService }); // composition
const orderService = new OrderService();
const checkoutService = new CheckoutService({
  pricingService, // has-a
  inventoryService, // has-a
  pickupService, // has-a
  couponService, // has-a
  cartService, // has-a
  paymentProvider, // has-a (abstract base class instance from the factory)
});
const paymentService = new PaymentService({
  paymentProvider,
  orderService,
  inventoryService,
});
const adminService = new AdminService();

// Proxy pattern: the real Gemini client wrapped with caching + logging + input bounds.
const aiProxy = new AIProxy(new GeminiClient());
const aiService = new AIService({ aiProxy });

module.exports = {
  authService,
  productService,
  cartService,
  couponService,
  pickupService,
  inventoryService,
  pricingService,
  checkoutService,
  paymentService,
  orderService,
  adminService,
  aiService,
  MAX_INPUT_CHARS,
};
