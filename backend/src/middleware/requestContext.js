// Middleware that starts the standard error envelope: every request gets a requestId.
const crypto = require('crypto');
const logger = require('../utils/logger');

module.exports = function requestContext(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms) [${req.requestId}]`);
  });
  next();
};
