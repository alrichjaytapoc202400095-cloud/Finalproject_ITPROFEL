// Shared UI constants / config that mirror the documented API contract.

export const MAX_AI_QUESTION_CHARS = 500;

export const ORDER_STATUS = {
  pending_payment: { label: 'Awaiting payment', tone: 'warn' },
  paid: { label: 'Paid', tone: 'success' },
  processing: { label: 'Processing', tone: 'info' },
  shipped: { label: 'Shipped', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  expired: { label: 'Expired', tone: 'muted' },
};

export const ORDER_STATUS_FLOW = {
  pending_payment: ['paid', 'cancelled', 'expired'],
  paid: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  expired: [],
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'title', label: 'Title A–Z' },
];

export const PAGE_SIZE = 12;

export const CACHE_KEYS = {
  cart: 'spc.cache.cart',
  catalog: 'spc.cache.catalog',
  categories: 'spc.cache.categories',
};
