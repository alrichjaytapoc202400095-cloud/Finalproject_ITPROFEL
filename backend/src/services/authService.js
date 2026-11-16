// Authentication business rules: hashing, tokens, duplicate emails, student verification.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { AppError } = require('../utils/errors');
const Notification = require('../models/Notification');

function token(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, name: user.name }, env.jwtSecret, {
    expiresIn: `${env.tokenTtlHours}h`,
  });
}

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    student: user.student || {},
  };
}

class AuthService {
  async register({ name, email, password, student }) {
    const emailNorm = String(email).trim().toLowerCase(); // plain string: blocks NoSQL operator injection (S-05)
    const existing = await User.findOne({ email: emailNorm });
    if (existing) throw new AppError(409, 'EMAIL_IN_USE', 'An account with that email already exists.');

    // Bootstrap rule: the very first registered account becomes the administrator.
    const isFirstUser = (await User.countDocuments()) === 0;
    const passwordHash = await bcrypt.hash(password, 10);

    const studentInfo = student && typeof student === 'object' ? student : null;
    const user = await User.create({
      name,
      email: emailNorm,
      passwordHash,
      role: isFirstUser ? 'admin' : 'customer',
      student: studentInfo
        ? { number: studentInfo.number || '', course: studentInfo.course || '', year: studentInfo.year || '', status: 'pending' }
        : { status: 'none' },
    });
    return { user: safeUser(user), token: token(user) };
  }

  async login({ email, password }) {
    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'); // generic on purpose
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    return { user: safeUser(user), token: token(user) };
  }

  async me(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found.');
    return safeUser(user);
  }

  // Level 3 feature 1: student verification queue. Verified students get the automatic
  // student discount at checkout (applied server-side in PricingService).
  async submitStudentVerification(userId, { number, course, year }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found.');
    user.student = { number, course, year, status: 'pending' };
    await user.save();
    return safeUser(user);
  }
}

module.exports = { AuthService, safeUser };
