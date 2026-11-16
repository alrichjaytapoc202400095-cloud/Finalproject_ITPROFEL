import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken, getStoredUser, setStoredUser } from '../api/client.js';

const AuthContext = createContext(null);

// Only these mean the session is really gone; a network error or a 5xx while the
// API wakes up must NOT log the user out.
const INVALID_SESSION_CODES = ['UNAUTHENTICATED', 'INVALID_TOKEN', 'USER_NOT_FOUND'];

export function AuthProvider({ children }) {
  // Start from the cached user so a page reload shows the signed-in UI at once,
  // then let /auth/me confirm it in the background.
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));
  const [loading, setLoading] = useState(() => Boolean(getToken()) && !getStoredUser());

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    api('/auth/me', { token })
      .then((fresh) => {
        if (!active) return;
        setUser(fresh);
        setStoredUser(fresh);
      })
      .catch((err) => {
        if (!active) return;
        // Keep the cached session on transient failures; the API client already
        // retried. Clear it only when the server says the token is invalid.
        if (INVALID_SESSION_CODES.includes(err.code)) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setStoredUser(data.user);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await api('/auth/register', { method: 'POST', body: payload });
    setToken(data.token);
    setStoredUser(data.user);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
