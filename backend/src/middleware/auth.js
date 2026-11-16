// Authentication middleware (S-02): verifies short-lived JWTs from the Authorization header.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.'));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch (e) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Your session has expired or the token is invalid. Please sign in again.'));
  }
}

module.exports = { authenticate };
