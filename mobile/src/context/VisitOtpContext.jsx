/**
 * Global visit OTP state for patients — popup on any screen when caregiver sends OTP.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { api } from '../api/client';
import { getSocket, connectSocket } from '../lib/socket';

const VisitOtpContext = createContext(null);
const OTP_POLL_MS = 10_000;

const purposeRank = (purpose) => (purpose === 'complete_visit' ? 2 : 1);

function isOtpExpired(otp) {
  if (!otp?.expiresAt) return false;
  return Date.now() >= otp.expiresAt;
}

function mergePendingOtp(pending, cached, requestId) {
  if (!pending) return null;
  if (!pending.otp && !pending.active) return null;

  let otp = pending.otp;
  if (
    !otp &&
    cached?.otp &&
    String(cached.requestId) === String(requestId) &&
    cached.purpose === pending.purpose
  ) {
    otp = cached.otp;
  }
  if (!otp) return null;

  const expiresAt = pending.expiresAt || cached?.expiresAt;
  if (expiresAt && Date.now() >= expiresAt) return null;

  return {
    requestId,
    purpose: pending.purpose,
    otp,
    expiresAt,
  };
}

function pickActiveOtpFromRequests(requests, cached = null) {
  if (!Array.isArray(requests)) return null;
  let best = null;
  for (const req of requests) {
    const candidate = mergePendingOtp(req?.pendingOtp, cached, req._id);
    if (!candidate) continue;
    if (!best || purposeRank(candidate.purpose) > purposeRank(best.purpose)) {
      best = candidate;
    }
  }
  return best;
}

function requestStillHasPendingOtp(requests, cached) {
  if (!cached?.requestId) return false;
  return (requests || []).some((req) => {
    if (String(req._id) !== String(cached.requestId)) return false;
    const pending = req?.pendingOtp;
    if (!pending) return false;
    if (pending.purpose && pending.purpose !== cached.purpose) return false;
    return Boolean(pending.active || pending.otp);
  });
}

function otpKey(otp) {
  if (!otp?.requestId || !otp?.otp) return '';
  return `${otp.requestId}:${otp.purpose}:${otp.otp}`;
}

export function VisitOtpProvider({ children }) {
  const { user, isAuthenticated, token } = useAuth();
  const [activeOtp, setActiveOtp] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const lastShownKeyRef = useRef('');
  const activeOtpRef = useRef(null);

  useEffect(() => {
    activeOtpRef.current = activeOtp;
  }, [activeOtp]);

  const isPatient = isAuthenticated && user?.role === 'user';

  const presentOtp = useCallback((next, { forcePopup = false } = {}) => {
    if (!next?.otp) {
      setActiveOtp(null);
      setPopupVisible(false);
      lastShownKeyRef.current = '';
      return;
    }
    setActiveOtp(next);
    const key = otpKey(next);
    if (forcePopup || key !== lastShownKeyRef.current) {
      lastShownKeyRef.current = key;
      setPopupVisible(true);
    }
  }, []);

  const dismissOtpPopup = useCallback(() => {
    setPopupVisible(false);
  }, []);

  const refreshFromApi = useCallback(async () => {
    if (!isPatient) {
      presentOtp(null);
      return;
    }
    try {
      const { data } = await api.get('/requests/mine', { params: { _ts: Date.now() } });
      const requests = data.requests || [];
      const cached = activeOtpRef.current;
      const found = pickActiveOtpFromRequests(requests, cached);

      if (found) {
        presentOtp(found, { forcePopup: otpKey(found) !== lastShownKeyRef.current });
        return;
      }

      if (cached?.otp && !isOtpExpired(cached) && requestStillHasPendingOtp(requests, cached)) {
        setActiveOtp(cached);
        return;
      }

      presentOtp(null);
    } catch {
      /* keep current popup if refresh fails */
    }
  }, [isPatient, presentOtp]);

  const applyOtpForRequest = useCallback(
    (requestId, pendingOtp) => {
      if (!requestId) return;

      if (pendingOtp == null) {
        setActiveOtp((cur) => {
          if (String(cur?.requestId) !== String(requestId)) return cur;
          setPopupVisible(false);
          lastShownKeyRef.current = '';
          return null;
        });
        return;
      }

      const cached = activeOtpRef.current;
      const merged = mergePendingOtp(
        pendingOtp,
        String(cached?.requestId) === String(requestId) ? cached : null,
        requestId
      );

      if (!merged) {
        if (pendingOtp.active) {
          setActiveOtp((cur) => {
            if (String(cur?.requestId) !== String(requestId) || !cur?.otp) return cur;
            return {
              ...cur,
              purpose: pendingOtp.purpose || cur.purpose,
              expiresAt: pendingOtp.expiresAt || cur.expiresAt,
            };
          });
        }
        return;
      }

      presentOtp(merged, { forcePopup: true });
    },
    [presentOtp]
  );

  useEffect(() => {
    if (!isPatient) {
      presentOtp(null);
      return undefined;
    }
    refreshFromApi();
  }, [isPatient, refreshFromApi, presentOtp]);

  useEffect(() => {
    if (!isPatient) return undefined;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshFromApi();
    });
    return () => sub.remove();
  }, [isPatient, refreshFromApi]);

  useEffect(() => {
    if (!isPatient) return undefined;
    const timer = setInterval(() => {
      refreshFromApi();
    }, OTP_POLL_MS);
    return () => clearInterval(timer);
  }, [isPatient, refreshFromApi]);

  useEffect(() => {
    if (!isPatient || !token) return undefined;

    const onOtpGenerated = (payload) => {
      const { requestId, purpose, otpPreview, pendingOtp } = payload || {};
      const otp = pendingOtp?.otp || otpPreview;
      if (!requestId || !otp) return;
      applyOtpForRequest(requestId, {
        purpose: pendingOtp?.purpose || purpose,
        otp,
        expiresAt: pendingOtp?.expiresAt,
      });
    };

    const onOtpSync = ({ requestId, pendingOtp }) => {
      applyOtpForRequest(requestId, pendingOtp);
    };

    const onConnect = () => {
      refreshFromApi();
    };

    const attach = (socket) => {
      socket.off('connect', onConnect);
      socket.off('request:otp-generated', onOtpGenerated);
      socket.off('request:otp-sync', onOtpSync);
      socket.on('connect', onConnect);
      socket.on('request:otp-generated', onOtpGenerated);
      socket.on('request:otp-sync', onOtpSync);
    };

    let cancelled = false;
    const bindSocket = (socket) => {
      if (cancelled || !socket) return;
      attach(socket);
      if (socket.connected) refreshFromApi();
    };

    bindSocket(getSocket());
    connectSocket(token).then(bindSocket);

    return () => {
      cancelled = true;
      const active = getSocket();
      if (active) {
        active.off('connect', onConnect);
        active.off('request:otp-generated', onOtpGenerated);
        active.off('request:otp-sync', onOtpSync);
      }
    };
  }, [isPatient, token, applyOtpForRequest, refreshFromApi]);

  const value = useMemo(
    () => ({
      activeOtp,
      popupVisible,
      dismissOtpPopup,
      refreshFromApi,
    }),
    [activeOtp, popupVisible, dismissOtpPopup, refreshFromApi]
  );

  return <VisitOtpContext.Provider value={value}>{children}</VisitOtpContext.Provider>;
}

export function useVisitOtp() {
  const ctx = useContext(VisitOtpContext);
  if (!ctx) {
    throw new Error('useVisitOtp must be used within VisitOtpProvider');
  }
  return ctx;
}

export function otpPurposeLabel(purpose) {
  if (purpose === 'complete_visit') return 'Complete visit OTP';
  if (purpose === 'start_visit') return 'Start visit OTP';
  return 'Visit OTP';
}
