import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  authApi,
} from '../api/endpoints.js';
import {
  clearSession,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken as persistToken,
} from '../api/client.js';

const AuthContext = createContext(null);

// Only these codes mean the session is truly gone. A network error while the
// API wakes up must never log the customer out.
const INVALID_SESSION_CODES = ['UNAUTHENTICATED', 'INVALID_TOKEN', 'USER_NOT_FOUND'];

export function AuthProvider({ children }) {
  // Hydrate instantly from the untrusted local cache; /auth/me confirms it.
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));
  const [loading, setLoading] = useState(() => Boolean(getToken()) && !getStoredUser());

  const applySession = useCallback((nextUser, nextToken) => {
    if (nextToken) persistToken(nextToken);
    if (nextUser) setStoredUser(nextUser);
    setTokenState(nextToken || null);
    setUser(nextUser || null);
  }, []);

  const clearSessionState = useCallback(() => {
    clearSession();
    setTokenState(null);
    setUser(null);
  }, []);

  // Validate the cached session once on boot (abortable on unmount).
  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    authApi
      .me({ token: currentToken, signal: controller.signal })
      .then((fresh) => {
        if (controller.signal.aborted) return;
        setUser(fresh);
        setStoredUser(fresh);
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return;
        if (INVALID_SESSION_CODES.includes(error.code)) clearSessionState();
        // Any other failure keeps the cached session and retries on next screen.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [clearSessionState]);

  // Global 401 handler from the API client.
  useEffect(() => {
    const onUnauthorized = () => clearSessionState();
    window.addEventListener('spc:unauthorized', onUnauthorized);
    return () => window.removeEventListener('spc:unauthorized', onUnauthorized);
  }, [clearSessionState]);

  // Cross-tab session sync.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'spc.token' && event.key !== 'spc.user' && event.key !== null) return;
      const nextToken = getToken();
      setTokenState(nextToken);
      setUser(nextToken ? getStoredUser() : null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      applySession(data.user, data.token);
      return data.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload);
      applySession(data.user, data.token);
      return data.user;
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSessionState();
  }, [clearSessionState]);

  const refreshUser = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) return null;
    const fresh = await authApi.me({ token: currentToken });
    setUser(fresh);
    setStoredUser(fresh);
    return fresh;
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    studentStatus: user?.student?.status || 'none',
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
