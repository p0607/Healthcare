/**
 * AuthContext (mobile) — port of frontend/src/context/AuthContext.jsx.
 *
 * Talks to the same Express endpoints:
 *   POST /auth/login     -> { token, user } | { needsRolePick, loginOptions, email }
 *   POST /auth/register  -> { token, user }
 *   GET  /auth/me        -> { user }
 *
 * Storage differs from web: token in SecureStore, user in AsyncStorage,
 * and hydration is async (so we expose `hydrating` while we read storage).
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { connectSocket, disconnectSocket } from '../lib/socket';
import {
  clearSession,
  getCachedUser,
  getToken,
  saveCachedUser,
  saveToken,
} from '../storage/session';
import { setUnauthorizedHandler } from '../lib/authSession';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [hydrating, setHydrating] = useState(true); // reading storage on launch
  const [loading, setLoading] = useState(false); // an auth request is in flight

  // 1. On launch, restore any saved session from device storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedToken, savedUser] = await Promise.all([getToken(), getCachedUser()]);
      if (cancelled) return;
      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(savedUser);
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Keep Socket.IO connected while logged in (same as web AuthContext).
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return undefined;
    }
    connectSocket(token).catch(() => {});
    return undefined;
  }, [token]);

  // Clear React state when storage is wiped after a 401.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      disconnectSocket();
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // 3. Whenever we have a token, refresh the user profile from the server.
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (cancelled || !data?.user) return;
        await saveCachedUser(data.user);
        setUser(data.user);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) {
          disconnectSocket();
          await clearSession();
          setToken(null);
          setUser(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const applySession = async (data) => {
    await saveToken(data.token);
    await saveCachedUser(data.user);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password, options = {}) => {
    setLoading(true);
    try {
      const body = { email, password };
      if (options.role) body.role = options.role;
      if (options.activeKind) body.activeKind = options.activeKind;

      const { data } = await api.post('/auth/login', body);

      // Account belongs to multiple roles — caller must pick one.
      if (data.needsRolePick) {
        return {
          needsRolePick: true,
          loginOptions: data.loginOptions,
          email: data.email,
        };
      }

      return applySession(data);
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = async (email, password, activeKind) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, activeKind });
      if (data.needsRolePick) {
        return {
          needsRolePick: true,
          loginOptions: data.loginOptions,
          email: data.email,
        };
      }
      return applySession(data);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      return applySession(data);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    disconnectSocket();
    await clearSession();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      hydrating,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      completeLogin,
      register,
      logout,
      setUser,
    }),
    [user, token, hydrating, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
