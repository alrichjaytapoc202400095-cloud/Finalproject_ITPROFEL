// Rate limiting (S-10): global limit plus stricter limits on auth and AI endpoints.
// In test mode the caps are raised so integration tests (one shared IP) are not throttled;
// the configured production caps still apply when NODE_ENV is not "test".
const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';
const cap = (n) => (isTest ? 100000 : n);

const handler = (req, res) => {
  res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again shortly.' },
    requestId: req.requestId,
  });
};

const general = rateLimit({ windowMs: 15 * 60 * 1000, limit: cap(300), standardHeaders: true, legacyHeaders: false, handler });
// 50 / 15 min: strong enough against brute force, lenient enough for repeated Postman collection runs.
const auth = rateLimit({ windowMs: 15 * 60 * 1000, limit: cap(50), standardHeaders: true, legacyHeaders: false, handler });
const ai = rateLimit({ windowMs: 15 * 60 * 1000, limit: cap(10), standardHeaders: true, legacyHeaders: false, handler });

module.exports = { general, auth, ai };
