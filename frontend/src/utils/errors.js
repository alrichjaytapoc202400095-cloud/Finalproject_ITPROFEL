// Maps backend error codes / HTTP statuses to user-friendly, actionable copy.
// Inline feedback is preferred over alert(); pages render the returned string.

export function isAbortError(error) {
  return error && error.name === 'AbortError';
}

export function isOfflineError(error) {
  return Boolean(error) && (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_TIMEOUT');
}

const CODE_MESSAGES = {
  UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
  INVALID_TOKEN: 'Your session has expired. Please sign in again.',
  USER_NOT_FOUND: 'Your account could not be found. Please sign in again.',
  FORBIDDEN: 'Your account does not have access to this area.',
  ADMIN_ONLY: 'This area is restricted to store administrators.',
  EMAIL_IN_USE: 'An account with that email already exists. Try signing in instead.',
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  PRODUCT_NOT_FOUND: 'This title is no longer available.',
  OUT_OF_STOCK: 'That quantity is no longer available. Please reduce it and try again.',
  PREORDER_NOT_RELEASED: 'This pre-order title is not released yet.',
  CART_ITEM_NOT_FOUND: 'That item is no longer in your cart.',
  EMPTY_CHECKOUT: 'Your cart is empty. Add a book before checking out.',
  COUPON_NOT_FOUND: 'That coupon code does not exist.',
  COUPON_EXPIRED: 'That coupon has expired. Remove it and try again.',
  COUPON_MIN_SPEND: 'Your subtotal does not meet the coupon minimum spend.',
  COUPON_LIMIT_REACHED: 'That coupon has reached its usage limit.',
  COUPON_ALREADY_USED: 'You have already used this coupon.',
  PICKUP_SLOT_REQUIRED: 'Choose a campus pickup slot to continue.',
  PICKUP_SLOT_FULL: 'That pickup slot is full. Choose another slot.',
  SLOT_NOT_FOUND: 'That pickup slot is no longer available.',
  INVALID_STATUS_TRANSITION: 'This order can no longer be changed to that status.',
  ORDER_NOT_FOUND: 'We could not find that order.',
  PAYMENT_NOT_FOUND: 'No payment was found for this order yet.',
  GATEWAY_UNAVAILABLE: 'The payment gateway is unreachable right now. Please retry in a moment.',
  GATEWAY_ERROR: 'The payment gateway rejected the request. Please retry or contact the store.',
  AI_UNAVAILABLE: 'The AI assistant is unavailable right now. Keyword search results are shown instead.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  NETWORK_ERROR: 'You appear to be offline. Check your connection and try again.',
  NETWORK_TIMEOUT: 'The server took too long to respond. Please try again.',
  STOCK_NEGATIVE: 'Stock cannot go below zero.',
};

/** Returns a clean, human-readable message for an ApiError (or any Error). */
export function describeError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code];
  if (error.message) return error.message;
  return fallback;
}

/** Extracts field-level errors from a 422 `details` payload. */
export function fieldErrors(error) {
  if (!error || !error.details) return {};
  if (Array.isArray(error.details)) {
    return error.details.reduce((acc, item) => {
      if (item && item.field) acc[item.field] = item.message || String(item);
      return acc;
    }, {});
  }
  if (typeof error.details === 'object') {
    return Object.entries(error.details).reduce((acc, [field, message]) => {
      acc[field] = Array.isArray(message) ? message.join(' ') : String(message);
      return acc;
    }, {});
  }
  return {};
}

/** True when a failed AI call should switch the UI to keyword-search mode. */
export function isAiUnavailable(error) {
  return Boolean(error) && (error.code === 'AI_UNAVAILABLE' || error.status === 503);
}
