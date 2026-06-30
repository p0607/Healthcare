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

function pickActiveOtpFromRequests(requests) {
  if (!Array.isArray(requests)) return null;
  let best = null;
  for (const req of requests) {
    const pending = req?.pendingOtp;
    if (!pending?.otp) continue;
    if (!best || purposeRank(pending.purpose) > purposeRank(best.purpose)) {
      best = {
        requestId: req._id,
        purpose: pending.purpose,
        otp: pending.otp,
        expiresAt: pending.expiresAt,
      };
    }
  }
  return best;
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
      const found = pickActiveOtpFromRequests(data.requests);
      if (found) {
        presentOtp(found, { forcePopup: otpKey(found) !== lastShownKeyRef.current });
      } else {
        presentOtp(null);
      }
    } catch {
      /* keep current popup if refresh fails */
    }
  }, [isPatient, presentOtp]);

  const applyOtpForRequest = useCallback(
    (requestId, pendingOtp) => {
      if (!requestId) return;
      if (!pendingOtp?.otp) {
        setActiveOtp((cur) => {
          if (cur?.requestId !== requestId) return cur;
          setPopupVisible(false);
          lastShownKeyRef.current = '';
          return null;
        });
        return;
      }
      presentOtp(
        {
          requestId,
          purpose: pendingOtp.purpose,
          otp: pendingOtp.otp,
          expiresAt: pendingOtp.expiresAt,
        },
        { forcePopup: true }
      );
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
