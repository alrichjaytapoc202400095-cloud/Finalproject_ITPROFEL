const container = require('../services/container');
const { ok, created, noContent } = require('../utils/response');
const { AppError } = require('../utils/errors');

// ---- Products ----
exports.listProducts = async (req, res) => {
  const { items, meta } = await container.productService.adminList(req.query);
  ok(res, items, meta);
};

exports.createProduct = async (req, res) => {
  created(res, await container.productService.adminCreate(req.body));
};

exports.updateProduct = async (req, res) => {
  ok(res, await container.productService.adminUpdate(req.params.id, req.body));
};

exports.deleteProduct = async (req, res) => {
  ok(res, await container.productService.adminDelete(req.params.id)); // soft delete
};

exports.adjustStock = async (req, res) => {
  created(res, await container.productService.adjustStock(req.params.id, req.body, req.user.id));
};

exports.stockMovements = async (req, res) => {
  ok(res, await container.productService.stockMovements(req.params.id));
};

// ---- Coupons ----
exports.listCoupons = async (req, res) => {
  const Coupon = require('../models/Coupon');
  ok(res, await Coupon.find().sort({ createdAt: -1 }));
};

exports.createCoupon = async (req, res) => {
  const Coupon = require('../models/Coupon');
  created(res, await Coupon.create(req.body));
};

exports.updateCoupon = async (req, res) => {
  const Coupon = require('../models/Coupon');
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
  Object.assign(coupon, req.body);
  await coupon.save();
  ok(res, coupon);
};

exports.deleteCoupon = async (req, res) => {
  const Coupon = require('../models/Coupon');
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
  coupon.active = false; // deactivate instead of hard delete (keeps order history valid)
  await coupon.save();
  noContent(res);
};

// ---- Orders ----
exports.listOrders = async (req, res) => {
  const { items, meta } = await container.orderService.adminList(req.query);
  ok(res, items, meta);
};

exports.setOrderStatus = async (req, res) => {
  ok(res, await container.orderService.adminSetStatus(req.params.id, req.body.status, req.user));
};

exports.reconcileOrder = async (req, res) => {
  ok(res, await container.paymentService.reconcile(req.params.id, req.user));
};

// ---- Dashboard ----
exports.dashboard = async (req, res) => {
  ok(res, await container.adminService.dashboard());
};

// ---- Pickup slots ----
exports.listSlots = async (req, res) => {
  ok(res, await container.pickupService.adminList());
};

exports.createSlot = async (req, res) => {
  created(res, await container.pickupService.create(req.body));
};

exports.updateSlot = async (req, res) => {
  ok(res, await container.pickupService.update(req.params.id, req.body));
};

exports.deleteSlot = async (req, res) => {
  ok(res, await container.pickupService.remove(req.params.id));
};

// ---- Student verification (Level 3 feature 1) ----
exports.studentQueue = async (req, res) => {
  ok(res, await container.adminService.studentQueue());
};

exports.setStudentVerification = async (req, res) => {
  ok(res, await container.adminService.setStudentVerification(req.params.id, req.body.approve, req.user));
};
