// Role-based authorization (S-03). Checked on the server, never only in the UI.
const { AppError } = require('../utils/errors');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

module.exports = { requireRole };
