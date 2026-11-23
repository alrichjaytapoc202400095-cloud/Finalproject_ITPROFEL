// Single, centralized API client for the whole PWA.
//
// Rules enforced here:
//  - Every network call goes to the documented /api/v1 REST API.
//  - The success envelope { success, data, meta } and the error envelope
//    { success:false, error:{ code, message, details }, requestId } are parsed once.
//  - Requests can be aborted (AbortController) so unmounted screens never set state.
//  - Idempotency-Key is forwarded for checkout attempts.
//  - No secrets live in this file: only the public API base URL from Vite env.

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_PREFIX = '/api/v1';

const TOKEN_KEY = 'spc.token';
const USER_KEY = 'spc.user';

// A single retry for transient cold-start/network failures keeps the UI honest
// without making the user wait ~30s when the API is genuinely down.
const GET_RETRY_DELAYS_MS = [500, 1500];

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Request failed.', details = null, requestId = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function defaultMessage(status) {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'We could not find what you were looking for.';
  if (status === 409) return 'That action conflicts with the current state. Please refresh.';
  if (status === 422) return 'Please check the highlighted fields and try again.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'The server is having trouble right now. Please try again.';
  return 'Request failed. Please try again.';
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    }
  });
}

/**
 * Low-level request. Returns { data, meta, status }.
 * Throws ApiError for API/HTTP/network problems; throws AbortError when cancelled.
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    token,
    signal,
    headers = {},
    idempotencyKey,
    timeoutMs = 15000,
    retries,
  } = options;

  const upperMethod = method.toUpperCase();
  const canRetry = upperMethod === 'GET';
  const maxRetries = canRetry ? (retries ?? GET_RETRY_DELAYS_MS.length) : 0;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const forwardAbort = () => controller.abort();

    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', forwardAbort, { once: true });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
        method: upperMethod,
        // API responses are per-user and must always carry a body. The Service
        // Worker performs the offline caching, not the HTTP cache, so no-store
        // avoids broken 304 responses while still allowing Workbox to cache GETs.
        cache: 'no-store',
        signal: controller.signal,
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const json = response.status === 204 ? null : await response.json().catch(() => null);

      if (!response.ok || !json || json.success === false) {
        const envelope = json && json.error ? json.error : {};
        const apiError = new ApiError({
          status: response.status,
          code: envelope.code || `HTTP_${response.status}`,
          message: envelope.message || defaultMessage(response.status),
          details: envelope.details ?? null,
          requestId: json?.requestId ?? null,
        });

        // One central place turns a dead session into a clean logout event.
        // Login failures are excluded: a wrong password is not an expired session.
        if (
          response.status === 401 &&
          token &&
          !path.startsWith('/auth/login') &&
          typeof window !== 'undefined'
        ) {
          window.dispatchEvent(new CustomEvent('spc:unauthorized'));
        }

        if (canRetry && response.status >= 500 && attempt < maxRetries) {
          lastError = apiError;
        } else {
          throw apiError;
        }
      } else {
        return { data: json.data, meta: json.meta ?? null, status: response.status };
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === 'AbortError') {
        // Caller cancelled (navigation/unmount): stay silent and let the caller ignore it.
        if (signal?.aborted) throw error;
        lastError = new ApiError({
          status: 0,
          code: timedOut ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR',
          message: timedOut
            ? 'The server took too long to respond. Please try again.'
            : 'Network request failed.',
        });
      } else {
        lastError = new ApiError({
          status: 0,
          code: 'NETWORK_ERROR',
          message: 'You appear to be offline, or the server is unreachable.',
        });
      }
      if (!canRetry || attempt >= maxRetries) throw lastError;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', forwardAbort);
    }

    // Only failed GETs reach this point: back off, then retry.
    try {
      const delay = GET_RETRY_DELAYS_MS[Math.min(attempt, GET_RETRY_DELAYS_MS.length - 1)];
      await sleep(delay + Math.round(Math.random() * 150), signal);
    } catch (error) {
      throw lastError || error;
    }
  }

  throw lastError;
}

/**
 * Convenience wrapper that returns the `data` payload and attaches `meta`
 * to it (array pages keep their array shape, objects keep their fields).
 */
export async function api(path, options = {}) {
  const { data, meta } = await request(path, options);
  if (meta) {
    if (Array.isArray(data)) return Object.assign(data, { meta });
    if (data && typeof data === 'object') return { ...data, meta };
  }
  return data;
}

// ---------------------------------------------------------------------------
// Session storage (untrusted cache: the server always re-validates /auth/me)
// ---------------------------------------------------------------------------
const safeStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage disabled: session simply won't survive a reload */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const getToken = () => safeStorage.get(TOKEN_KEY);
export const setToken = (token) => safeStorage.set(TOKEN_KEY, token);
export const getStoredUser = () => {
  try {
    return JSON.parse(safeStorage.get(USER_KEY));
  } catch {
    return null;
  }
};
export const setStoredUser = (user) => {
  if (user) safeStorage.set(USER_KEY, JSON.stringify(user));
  else safeStorage.remove(USER_KEY);
};
export const clearSession = () => {
  safeStorage.remove(TOKEN_KEY);
  safeStorage.remove(USER_KEY);
};

// Local cache helpers used for offline browsing (never trusted as authority).
export function readJsonCache(key, fallback = null) {
  try {
    const raw = safeStorage.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJsonCache(key, value) {
  try {
    safeStorage.set(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}
export function removeCache(key) {
  safeStorage.remove(key);
}
