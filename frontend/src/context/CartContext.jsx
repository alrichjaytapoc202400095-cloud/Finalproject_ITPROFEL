import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);
const EMPTY_CART = { items: [], itemCount: 0, subtotalCents: 0 };

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setCart(EMPTY_CART);
      return;
    }
    try {
      setCart(await api('/cart', { token: getToken() }));
    } catch {
      /* ignore - cart refreshes on next action */
    }
  }, []);

  useEffect(() => {
    // Also runs on logout: without a token, the cart is cleared instead of
    // leaving the previous customer's item count in the navbar.
    if (getToken()) refresh();
    else setCart(EMPTY_CART);
  }, [user, refresh]);

  async function mutate(action) {
    const result = await action();
    if (result) setCart(result);
    else await refresh();
  }

  const addItem = (productId, qty) => mutate(() => api('/cart/items', { method: 'POST', body: { productId, qty }, token: getToken() }));
  const updateItem = (productId, qty) => mutate(() => api(`/cart/items/${productId}`, { method: 'PATCH', body: { qty }, token: getToken() }));
  const removeItem = (productId) => mutate(() => api(`/cart/items/${productId}`, { method: 'DELETE', token: getToken() }));

  return (
    <CartContext.Provider value={{ cart, refresh, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
