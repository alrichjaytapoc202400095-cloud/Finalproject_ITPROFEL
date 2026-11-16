// Centralized error handling (S-11): generic message + requestId on 500, details only in server logs.
const logger = require('../utils/logger');
const { isAppError } = require('../utils/errors');

function notFound(req, res, next) {
  next({ status: 404, code: 'NOT_FOUND', message: 'The requested resource was not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const requestId = req.requestId || 'n/a';
  if (isAppError(err)) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      requestId,
    });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', details: err.errors },
      requestId,
    });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE', message: 'That record already exists.' },
      requestId,
    });
  }
  // A malformed Mongo ObjectId in a path/query is "not found", never a 500.
  if (err && err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
      requestId,
    });
  }
  logger.error(`Unhandled error [${requestId}]`, err && err.stack ? err.stack : err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' },
    requestId,
  });
}

module.exports = { notFound, errorHandler };
