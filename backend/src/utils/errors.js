// AppError: the only error type the API throws on purpose.
// The central error handler turns it into the standard error envelope.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isAppError = (e) => e instanceof AppError;

module.exports = { AppError, isAppError };
