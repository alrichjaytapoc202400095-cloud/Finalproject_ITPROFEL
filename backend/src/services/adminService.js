// Admin operations: dashboard figures, student verification approvals, order management glue.
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { AppError } = require('../utils/errors');

const PAID_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

class AdminService {
  // Dashboard (L1-12): figures reconcile directly with the database.
  async dashboard() {
    const [paidCount, grossAggregate, pendingCount, lowStock] = await Promise.all([
      Order.countDocuments({ status: { $in: PAID_STATUSES } }),
      Order.aggregate([
        { $match: { status: { $in: PAID_STATUSES } } },
        { $group: { _id: null, grossCents: { $sum: '$totalCents' } } },
      ]),
      Order.countDocuments({ status: 'pending_payment' }),
      Product.find({ isActive: true, stock: { $lte: 5 } }).select('title stock courseCode').sort({ stock: 1 }).limit(10),
    ]);
    return {
      totalPaidOrders: paidCount,
      grossSalesCents: grossAggregate[0] ? grossAggregate[0].grossCents : 0,
      pendingOrders: pendingCount,
      lowStock,
    };
  }

  // Student verification queue (Level 3 feature 1).
  async studentQueue() {
    return User.find({ role: 'customer', 'student.status': { $in: ['pending', 'verified', 'rejected'] } })
      .select('name email student')
      .sort({ updatedAt: -1 });
  }

  async setStudentVerification(userId, approve, admin) {
    const user = await User.findById(userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Student not found.');
    user.student.status = approve ? 'verified' : 'rejected';
    await user.save();
    await Notification.create({
      user: user._id,
      type: 'student.verification',
      message: approve
        ? 'Your student discount is now active. It is applied automatically at checkout.'
        : 'Your student verification was not approved. Please contact the bookstore.',
    });
    return { id: user._id, name: user.name, email: user.email, student: user.student };
  }
}

module.exports = { AdminService };
