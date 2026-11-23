// Thin, documented wrappers around the Express /api/v1 endpoints.
// Pages never build URLs by hand: everything goes through these functions.
import { api } from './client.js';

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

const id = (value) => encodeURIComponent(value);

export const authApi = {
  login: (body) => api('/auth/login', { method: 'POST', body }),
  register: (body) => api('/auth/register', { method: 'POST', body }),
  me: ({ token, signal }) => api('/auth/me', { token, signal }),
  submitStudentVerification: (body, { token }) =>
    api('/auth/student-verification', { method: 'POST', token, body }),
};

export const catalogApi = {
  categories: ({ signal } = {}) => api('/categories', { signal }),
  products: (params = {}, { signal } = {}) => api(`/products${qs(params)}`, { signal }),
  product: (productId, { signal } = {}) => api(`/products/${id(productId)}`, { signal }),
  pickupSlots: ({ signal } = {}) => api('/pickup-slots', { signal }),
};

export const cartApi = {
  get: ({ token, signal }) => api('/cart', { token, signal }),
  addItem: ({ productId, qty }, { token }) =>
    api('/cart/items', { method: 'POST', token, body: { productId, qty } }),
  updateItem: ({ productId, qty }, { token }) =>
    api(`/cart/items/${id(productId)}`, { method: 'PATCH', token, body: { qty } }),
  removeItem: (productId, { token }) =>
    api(`/cart/items/${id(productId)}`, { method: 'DELETE', token }),
};

export const checkoutApi = {
  // The Idempotency-Key makes a double tap return the SAME order.
  place: (body, { token, idempotencyKey }) =>
    api('/checkout', { method: 'POST', token, body, idempotencyKey }),
  paymentStatus: (orderId, { token }) =>
    api(`/payments/status/${id(orderId)}`, { token }),
};

export const ordersApi = {
  list: (params = {}, { token, signal } = {}) => api(`/orders${qs(params)}`, { token, signal }),
  get: (orderId, { token, signal } = {}) => api(`/orders/${id(orderId)}`, { token, signal }),
  cancel: (orderId, { token }) => api(`/orders/${id(orderId)}/cancel`, { method: 'POST', token }),
  retryPayment: (orderId, { token }) => api(`/orders/${id(orderId)}/pay`, { method: 'POST', token }),
};

export const aiApi = {
  ask: (question, { token, signal }) =>
    api('/ai/assistant', { method: 'POST', token, body: { question }, signal, timeoutMs: 25000 }),
};

export const adminApi = {
  dashboard: ({ token, signal }) => api('/admin/dashboard', { token, signal }),
  students: ({ token, signal }) => api('/admin/students', { token, signal }),
  setStudentVerification: (userId, approve, { token }) =>
    api(`/admin/students/${id(userId)}/verification`, { method: 'PATCH', token, body: { approve } }),

  products: (params = {}, { token, signal } = {}) => api(`/admin/products${qs(params)}`, { token, signal }),
  createProduct: (body, { token }) => api('/admin/products', { method: 'POST', token, body }),
  updateProduct: (productId, body, { token }) =>
    api(`/admin/products/${id(productId)}`, { method: 'PATCH', token, body }),
  deleteProduct: (productId, { token }) =>
    api(`/admin/products/${id(productId)}`, { method: 'DELETE', token }),
  adjustStock: (productId, body, { token }) =>
    api(`/admin/products/${id(productId)}/stock`, { method: 'POST', token, body }),

  coupons: ({ token, signal }) => api('/admin/coupons', { token, signal }),
  createCoupon: (body, { token }) => api('/admin/coupons', { method: 'POST', token, body }),
  updateCoupon: (couponId, body, { token }) =>
    api(`/admin/coupons/${id(couponId)}`, { method: 'PATCH', token, body }),
  deleteCoupon: (couponId, { token }) =>
    api(`/admin/coupons/${id(couponId)}`, { method: 'DELETE', token }),

  orders: (params = {}, { token, signal } = {}) => api(`/admin/orders${qs(params)}`, { token, signal }),
  setOrderStatus: (orderId, status, { token }) =>
    api(`/admin/orders/${id(orderId)}/status`, { method: 'PATCH', token, body: { status } }),
  reconcileOrder: (orderId, { token }) =>
    api(`/admin/orders/${id(orderId)}/reconcile`, { method: 'POST', token }),

  pickupSlots: ({ token, signal }) => api('/admin/pickup-slots', { token, signal }),
  createPickupSlot: (body, { token }) => api('/admin/pickup-slots', { method: 'POST', token, body }),
  updatePickupSlot: (slotId, body, { token }) =>
    api(`/admin/pickup-slots/${id(slotId)}`, { method: 'PATCH', token, body }),
  deletePickupSlot: (slotId, { token }) =>
    api(`/admin/pickup-slots/${id(slotId)}`, { method: 'DELETE', token }),
};
