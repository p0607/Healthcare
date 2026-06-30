import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import {
  SOS_SOCKET_EVENTS,
  handleIncomingSosAlert,
  subscribeSosNavigate,
  stopSosAlarm,
} from '../lib/emergencyAlerts';

const AuthContext = createContext(null);

function persistUser(user) {
  if (user) localStorage.setItem('nc_user', JSON.stringify(user));
  else localStorage.removeItem('nc_user');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('nc_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('nc_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
    return () => {};
  }, [token]);

  useEffect(() => {
    if (!token || !user) return undefined;

    const socket = getSocket() || connectSocket(token);
    if (!socket) return undefined;

    const onEmergency = (payload) => {
      handleIncomingSosAlert(payload, {
        user,
        showToast: (msg, opts) => {
          if (opts?.type === 'error') toast.error(msg, opts);
          else toast.success(msg, opts);
        },
      });
    };

    for (const evt of SOS_SOCKET_EVENTS) socket.on(evt, onEmergency);
    return () => {
      for (const evt of SOS_SOCKET_EVENTS) socket.off(evt, onEmergency);
      stopSosAlarm();
    };
  }, [token, user]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (cancelled || !data?.user) return;
        persistUser(data.user);
        setUser(data.user);
      } catch {
        /* keep cached user if refresh fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const applySession = (data) => {
    localStorage.setItem('nc_token', data.token);
    persistUser(data.user);
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

  const switchActiveKind = (activeKind) => {
    if (!user?.loginOptions?.length) return null;
    const option = user.loginOptions.find((o) => o.kind === activeKind);
    if (!option) return null;
    const next = {
      ...user,
      activeKind,
      role: option.sessionRole,
    };
    persistUser(next);
    setUser(next);
    return next;
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

  const logout = () => {
    localStorage.removeItem('nc_token');
    persistUser(null);
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      completeLogin,
      switchActiveKind,
      register,
      logout,
      setUser,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
