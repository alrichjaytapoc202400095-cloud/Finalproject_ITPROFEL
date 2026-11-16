// One API client module (C.3): every request goes through here.
// The token lives in localStorage; the API URL comes from .env in production,
// and from the Vite dev proxy in development.
const API_URL = import.meta.env.VITE_API_URL || '';
// Cold starts (the API booting, or a sleeping free-tier host waking up) can take
// longer than a few seconds. Retry GETs for ~30s so the first page load recovers
// on its own instead of showing an error until the user refreshes.
const GET_RETRY_DELAYS_MS = [400, 800, 1600, 2400, 3600, 5000, 5000, 5000];

async function fetchWithRetry(url, options) {
  const canRetry = options.method === 'GET';

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!canRetry || response.status < 500 || attempt >= GET_RETRY_DELAYS_MS.length) {
        return response;
      }
    } catch (error) {
      if (!canRetry || attempt >= GET_RETRY_DELAYS_MS.length) throw error;
    }

    const jitter = Math.round(Math.random() * 200);
    await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAYS_MS[attempt] + jitter));
  }
}

export class ApiError extends Error {
  constructor(errorEnvelope) {
    super(errorEnvelope.message || 'Request failed');
    this.code = errorEnvelope.code;
    this.details = errorEnvelope.details;
  }
}

export async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const requestMethod = method.toUpperCase();
  const res = await fetchWithRetry(`${API_URL}/api/v1${path}`, {
    method: requestMethod,
    // API data is per-user and changes constantly. Bypassing the HTTP cache
    // prevents conditional requests: a 304 has no body, which used to surface
    // as "Server unreachable." until a hard refresh.
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({ success: false, error: { code: 'NETWORK', message: 'Server unreachable.' } }));
  if (!json.success) throw new ApiError(json.error || { message: 'Request failed' });
  // The envelope keeps pagination (and a few flags) in a top-level `meta`
  // (see backend utils/response.js). Attach it to the returned value without
  // changing its shape: list pages get an array with `.meta`, objects keep
  // their fields (e.g. checkout's `checkoutUrl`) plus `.meta`.
  if (json.meta) {
    if (Array.isArray(json.data)) return Object.assign(json.data, { meta: json.meta });
    if (json.data && typeof json.data === 'object') return { ...json.data, meta: json.meta };
  }
  return json.data;
}

export const getToken = () => localStorage.getItem('spc_token');
export const setToken = (t) => localStorage.setItem('spc_token', t);
export const clearToken = () => {
  localStorage.removeItem('spc_token');
  localStorage.removeItem('spc_user');
};

// Cache the signed-in user so a reload can render instantly, before /auth/me
// answers. The server response always replaces it once available.
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('spc_user'));
  } catch {
    return null;
  }
};
export const setStoredUser = (u) => {
  if (u) localStorage.setItem('spc_user', JSON.stringify(u));
  else localStorage.removeItem('spc_user');
};

export function pesos(cents) {
  return `₱${(Number(cents || 0) / 100).toFixed(2)}`;
}
