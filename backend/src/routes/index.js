// Routes (Express routers ONLY - no business logic, T-01).
// Each handler is wrapped by the Decorator (async error forwarding + timing),
// writes are validated (422 with field details), admin areas require the admin role.
const express = require('express');
const wrap = require('../patterns/decorator/wrap');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { ai: aiLimiter, auth: authLimiter } = require('../middleware/rateLimits');
const { MAX_INPUT_CHARS } = require('../services/container');
const R = require('../validators/rules');

const container = require('../services/container');
const { ok } = require('../utils/response');
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const checkoutController = require('../controllers/checkoutController');
const paymentController = require('../controllers/paymentController');
const orderController = require('../controllers/orderController');
const aiController = require('../controllers/aiController');
const adminController = require('../controllers/adminController');

const router = express.Router();

// ---------- Health ----------
router.get('/health', wrap((req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'spc-bookstore-api', version: 'v1' } });
}));

// ---------- Auth (L1-01/L1-02 + student verification) ----------
router.post(
  '/auth/register',
  authLimiter,
  validate({ body: { name: R.string(true, 2, 120), email: R.email(), password: R.password(), student: R.object(false), __pick: ['name', 'email', 'password', 'student'] } }),
  wrap(authController.register)
);
router.post(
  '/auth/login',
  authLimiter,
  validate({ body: { email: R.email(), password: R.string(true, 1, 72), __pick: ['email', 'password'] } }),
  wrap(authController.login)
);
router.get('/auth/me', authenticate, wrap(authController.me));
router.post(
  '/auth/student-verification',
  authenticate,
  validate({
    body: {
      number: R.string(true, 3, 40),
      course: R.string(true, 2, 80),
      year: R.string(true, 1, 20),
      __pick: ['number', 'course', 'year'],
    },
  }),
  wrap(authController.submitStudentVerification)
);

// ---------- Catalog (public) ----------
router.get('/categories', wrap(productController.categories));
router.get('/products', wrap(productController.list));
router.get('/products/:id', wrap(productController.get));
router.get('/pickup-slots', wrap(async (req, res) => {
  ok(res, await container.pickupService.listPublic());
}));

// ---------- Cart (customer) ----------
router.get('/cart', authenticate, wrap(cartController.get));
router.post(
  '/cart/items',
  authenticate,
  validate({ body: { productId: R.objectId(), qty: R.int(true, 1, 99), __pick: ['productId', 'qty'] } }),
  wrap(cartController.addItem)
);
router.patch(
  '/cart/items/:productId',
  authenticate,
  validate({ body: { qty: R.int(true, 0, 99), __pick: ['qty'] }, params: { productId: R.objectId() } }),
  wrap(cartController.updateItem)
);
router.delete('/cart/items/:productId', authenticate, wrap(cartController.removeItem));

// ---------- Checkout + payment ----------
router.post(
  '/checkout',
  authenticate,
  validate({
    body: {
      method: R.enumOf(['pickup', 'delivery']),
      items: R.array(false, 0, 20),
      couponCode: R.string(false, 0, 30),
      pickupSlotId: R.objectId(false),
      shipping: R.object(false),
      __pick: ['method', 'items', 'couponCode', 'pickupSlotId', 'shipping'],
    },
  }),
  wrap(checkoutController.checkout)
);
router.get('/payments/status/:orderId', authenticate, wrap(paymentController.status));

// ---------- Orders (customer) ----------
router.get('/orders', authenticate, wrap(orderController.list));
router.get('/orders/:id', authenticate, wrap(orderController.get));
router.post('/orders/:id/cancel', authenticate, wrap(orderController.cancel));
router.post('/orders/:id/pay', authenticate, wrap(orderController.retryPayment));

// ---------- AI assistant (Level 4) ----------
router.post(
  '/ai/assistant',
  authenticate,
  aiLimiter,
  validate({ body: { question: { type: 'string', required: true, min: 3, max: MAX_INPUT_CHARS }, __pick: ['question'] } }),
  wrap(aiController.assistant)
);

// ---------- Admin (every route here rejects customer tokens with 403, S-03) ----------
const adminOnly = [authenticate, requireRole('admin')];

router.get('/admin/dashboard', adminOnly, wrap(adminController.dashboard));
router.get('/admin/students', adminOnly, wrap(adminController.studentQueue));
router.patch(
  '/admin/students/:id/verification',
  adminOnly,
  validate({ body: { approve: R.bool(), __pick: ['approve'] }, params: { id: R.objectId() } }),
  wrap(adminController.setStudentVerification)
);

router.get('/admin/products', adminOnly, wrap(adminController.listProducts));
router.post(
  '/admin/products',
  adminOnly,
  validate({
    body: {
      title: R.string(true, 2, 200),
      author: R.string(false, 0, 120),
      description: R.text(false, 4000),
      price: { type: 'number', required: true },
      categoryId: R.objectId(),
      stock: R.int(true, 0, 100000),
      courseCode: R.string(false, 0, 20),
      imageUrl: R.string(false, 0, 500),
      isPreOrder: R.bool(false),
      releaseDate: R.date(false),
      __pick: ['title', 'author', 'description', 'price', 'categoryId', 'stock', 'courseCode', 'imageUrl', 'isPreOrder', 'releaseDate'],
    },
  }),
  wrap(adminController.createProduct)
);
router.patch(
  '/admin/products/:id',
  adminOnly,
  validate({
    body: {
      title: R.string(false, 2, 200),
      author: R.string(false, 0, 120),
      description: R.text(false, 4000),
      price: { type: 'number', required: false },
      categoryId: R.objectId(false),
      stock: R.int(false, 0, 100000),
      courseCode: R.string(false, 0, 20),
      imageUrl: R.string(false, 0, 500),
      isActive: R.bool(false),
      isPreOrder: R.bool(false),
      releaseDate: R.date(false),
      __pick: ['title', 'author', 'description', 'price', 'categoryId', 'stock', 'courseCode', 'imageUrl', 'isActive', 'isPreOrder', 'releaseDate'],
    },
    params: { id: R.objectId() },
  }),
  wrap(adminController.updateProduct)
);
router.delete('/admin/products/:id', adminOnly, wrap(adminController.deleteProduct));
router.post(
  '/admin/products/:id/stock',
  adminOnly,
  validate({
    body: {
      delta: { type: 'int', required: true, min: -100000, max: 100000 },
      reason: R.string(true, 3, 200),
      __pick: ['delta', 'reason'],
    },
    params: { id: R.objectId() },
  }),
  wrap(adminController.adjustStock)
);
router.get('/admin/products/:id/stock-movements', adminOnly, wrap(adminController.stockMovements));

router.get('/admin/coupons', adminOnly, wrap(adminController.listCoupons));
router.post(
  '/admin/coupons',
  adminOnly,
  validate({
    body: {
      code: R.string(true, 3, 30),
      type: R.enumOf(['percentage', 'fixed']),
      value: R.int(true, 1, 100000000),
      minSpendCents: R.cents(false),
      expiresAt: R.date(),
      usageLimit: R.int(false, 0, 1000000),
      perCustomerLimit: R.int(false, 0, 1000),
      active: R.bool(false),
      __pick: ['code', 'type', 'value', 'minSpendCents', 'expiresAt', 'usageLimit', 'perCustomerLimit', 'active'],
    },
  }),
  wrap(adminController.createCoupon)
);
router.patch(
  '/admin/coupons/:id',
  adminOnly,
  validate({
    body: {
      value: R.int(false, 1, 100000000),
      minSpendCents: R.cents(false),
      expiresAt: R.date(false),
      usageLimit: R.int(false, 0, 1000000),
      perCustomerLimit: R.int(false, 0, 1000),
      active: R.bool(false),
      __pick: ['value', 'minSpendCents', 'expiresAt', 'usageLimit', 'perCustomerLimit', 'active'],
    },
    params: { id: R.objectId() },
  }),
  wrap(adminController.updateCoupon)
);
router.delete('/admin/coupons/:id', adminOnly, wrap(adminController.deleteCoupon));

router.get('/admin/orders', adminOnly, wrap(adminController.listOrders));
router.patch(
  '/admin/orders/:id/status',
  adminOnly,
  validate({
    body: {
      status: R.enumOf(['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired']),
      __pick: ['status'],
    },
    params: { id: R.objectId() },
  }),
  wrap(adminController.setOrderStatus)
);
router.post('/admin/orders/:id/reconcile', adminOnly, wrap(adminController.reconcileOrder));

router.get('/admin/pickup-slots', adminOnly, wrap(adminController.listSlots));
router.post(
  '/admin/pickup-slots',
  adminOnly,
  validate({
    body: {
      date: { type: 'string', required: true, min: 10, max: 10 },
      timeWindow: R.string(true, 3, 40),
      capacity: R.int(true, 1, 500),
      __pick: ['date', 'timeWindow', 'capacity'],
    },
  }),
  wrap(adminController.createSlot)
);
router.patch(
  '/admin/pickup-slots/:id',
  adminOnly,
  validate({ body: { capacity: R.int(false, 1, 500), isActive: R.bool(false), __pick: ['capacity', 'isActive'] }, params: { id: R.objectId() } }),
  wrap(adminController.updateSlot)
);
router.delete('/admin/pickup-slots/:id', adminOnly, wrap(adminController.deleteSlot));

module.exports = router;
