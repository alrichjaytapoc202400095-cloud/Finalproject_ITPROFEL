// DECORATOR (B.5.3): wraps route handlers and adds behavior without editing them:
// async error forwarding to the central error handler + request timing logs.
const logger = require('../../utils/logger');

function wrap(handler) {
  return function decorated(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (res.statusCode >= 500) logger.error(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = wrap;
