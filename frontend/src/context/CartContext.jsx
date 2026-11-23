import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi } from '../api/endpoints.js';
import {
  getToken,
  readJsonCache,
  removeCache,
  writeJsonCache,
} from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useNetworkStatus } from './NetworkStatusContext.jsx';
import { CACHE_KEYS } from '../utils/constants.js';
import { describeError, isOfflineError } from '../utils/errors.js';

const CartContext = createContext(null);
const EMPTY_CART = { items: [], itemCount: 0, subtotalCents: 0 };

function totals(items) {
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
    subtotalCents: items.reduce((sum, item) => sum + item.priceCents * item.qty, 0),
  };
}

function normalize(cart) {
  if (!cart || !Array.isArray(cart.items)) return EMPTY_CART;
  return {
    items: cart.items,
    itemCount: cart.itemCount ?? cart.items.reduce((sum, item) => sum + item.qty, 0),
    subtotalCents:
      cart.subtotalCents ?? cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0),
  };
}

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const { online } = useNetworkStatus();

  const [cart, setCart] = useState(() => {
    if (!getToken()) return EMPTY_CART;
    return normalize(readJsonCache(CACHE_KEYS.cart, EMPTY_CART));
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offlineSnapshot, setOfflineSnapshot] = useState(false);
  const [pendingIds, setPendingIds] = useState({});

  const commit = useCallback((next) => {
    const normalized = normalize(next);
    setCart(normalized);
    writeJsonCache(CACHE_KEYS.cart, normalized);
    return normalized;
  }, []);

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      const currentToken = getToken();
      if (!currentToken) {
        setCart(EMPTY_CART);
        removeCache(CACHE_KEYS.cart);
        return EMPTY_CART;
      }

      if (!silent) setLoading(true);
      setError('');
      try {
        const next = await cartApi.get({ token: currentToken });
        setOfflineSnapshot(false);
        return commit(next);
      } catch (caught) {
        if (isOfflineError(caught)) {
          // Offline: keep the last authoritative snapshot visible, clearly labelled.
          setOfflineSnapshot(true);
          setCart((current) => normalize(readJsonCache(CACHE_KEYS.cart, current)));
          return cart;
        }
        setError(describeError(caught));
        throw caught;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [commit, cart]
  );

  // Refresh whenever the signed-in user changes; clear on logout.
  useEffect(() => {
    if (!token) {
      setCart(EMPTY_CART);
      setOfflineSnapshot(false);
      removeCache(CACHE_KEYS.cart);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    cartApi
      .get({ token, signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setOfflineSnapshot(false);
        commit(next);
      })
      .catch((caught) => {
        if (controller.signal.aborted || caught.name === 'AbortError') return;
        if (isOfflineError(caught)) {
          setOfflineSnapshot(true);
          setCart((current) => normalize(readJsonCache(CACHE_KEYS.cart, current)));
        } else {
          setError(describeError(caught));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, commit]);

  // Coming back online: silently reconcile the cart with the server.
  useEffect(() => {
    if (!online || !token) return;
    refresh({ silent: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const markPending = useCallback((productId, isPending) => {
    setPendingIds((current) => {
      const next = { ...current };
      if (isPending) next[productId] = true;
      else delete next[productId];
      return next;
    });
  }, []);

  const addItem = useCallback(
    async (productId, qty = 1) => {
      if (!online) {
        const offlineError = new Error('You are offline. Reconnect to update your cart.');
        offlineError.code = 'NETWORK_ERROR';
        throw offlineError;
      }
      const currentToken = getToken();
      if (!currentToken) throw new Error('Please sign in to add items to your cart.');
      markPending(productId, true);
      try {
        const next = await cartApi.addItem({ productId, qty }, { token: currentToken });
        setOfflineSnapshot(false);
        return commit(next);
      } finally {
        markPending(productId, false);
      }
    },
    [commit, markPending, online]
  );

  // Optimistic quantity change: the UI reacts instantly, then the authoritative
  // server cart replaces it (or the previous cart is restored on failure).
  const updateItem = useCallback(
    async (productId, qty) => {
      if (!online) {
        const offlineError = new Error('You are offline. Reconnect to change quantities.');
        offlineError.code = 'NETWORK_ERROR';
        throw offlineError;
      }
      const previous = cart;
      const optimisticItems = previous.items
        .map((item) =>
          item.productId === productId
            ? { ...item, qty, lineTotalCents: item.priceCents * qty }
            : item
        )
        .filter((item) => item.qty > 0);
      setCart(totals(optimisticItems));
      markPending(productId, true);

      try {
        const next = await cartApi.updateItem({ productId, qty }, { token: getToken() });
        return commit(next);
      } catch (caught) {
        setCart(previous);
        throw caught;
      } finally {
        markPending(productId, false);
      }
    },
    [cart, commit, markPending, online]
  );

  const removeItem = useCallback(
    async (productId) => {
      if (!online) {
        const offlineError = new Error('You are offline. Reconnect to remove items.');
        offlineError.code = 'NETWORK_ERROR';
        throw offlineError;
      }
      const previous = cart;
      setCart(totals(previous.items.filter((item) => item.productId !== productId)));
      markPending(productId, true);

      try {
        const next = await cartApi.removeItem(productId, { token: getToken() });
        return commit(next);
      } catch (caught) {
        setCart(previous);
        throw caught;
      } finally {
        markPending(productId, false);
      }
    },
    [cart, commit, markPending, online]
  );

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      offlineSnapshot,
      pendingIds,
      isMutating: Object.keys(pendingIds).length > 0,
      refresh,
      addItem,
      updateItem,
      removeItem,
    }),
    [cart, loading, error, offlineSnapshot, pendingIds, refresh, addItem, updateItem, removeItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

export { EMPTY_CART };
