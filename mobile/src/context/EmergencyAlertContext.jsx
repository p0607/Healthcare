import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { connectSocket, getSocket } from '../lib/socket';
import { api } from '../api/client';
import {
  SOS_SOCKET_EVENTS,
  extractEmergencyRouteParams,
  handleIncomingSosPayload,
  registerExpoPushToken,
  requestEmergencyNotificationPermissions,
  stopEmergencyAlarm,
} from '../lib/emergencyAlerts';

const EmergencyAlertContext = createContext(null);

function shouldBookEmergency(user, payload) {
  if (!user || !payload?.patientId) return false;
  if (user.role === 'admin') return false;
  if (user.id === payload.patientId) return false;
  return payload.action === 'book_emergency';
}

function shouldShowSosAlert(user, payload) {
  if (!user || !payload?.patientId) return false;
  if (user.id === payload.patientId) return false;
  return true;
}

export function EmergencyAlertProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();
  const lastAlertAt = useRef(0);

  const openEmergencyBooking = useCallback(
    (patientId) => {
      stopEmergencyAlarm().catch(() => {});
      router.push({
        pathname: '/(app)/book/emergency',
        params: patientId ? { patientId } : {},
      });
    },
    [router]
  );

  const onSosPayload = useCallback(
    (payload) => {
      if (!shouldShowSosAlert(user, payload)) return;

      const now = Date.now();
      if (now - lastAlertAt.current < 3000) return;
      lastAlertAt.current = now;

      handleIncomingSosPayload(payload).catch(() => {});

      if (user.role === 'admin') {
        Alert.alert(
          'SOS emergency',
          payload.message || `${payload.patientName || 'A patient'} needs help.`,
          [{ text: 'OK' }]
        );
        return;
      }

      if (shouldBookEmergency(user, payload)) {
        Alert.alert(
          'Emergency alert',
          payload.message || 'A patient triggered SOS. Open emergency booking?',
          [
            { text: 'Dismiss', style: 'cancel', onPress: () => stopEmergencyAlarm() },
            {
              text: 'Book emergency',
              style: 'destructive',
              onPress: () => openEmergencyBooking(payload.patientId),
            },
          ]
        );
      }
    },
    [openEmergencyBooking, user]
  );

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;

    registerExpoPushToken(api).catch(() => {});
    requestEmergencyNotificationPermissions().catch(() => {});

    let socket = getSocket();
    if (!socket) {
      connectSocket(token).then((s) => {
        socket = s;
      });
    }

    const attach = (s) => {
      if (!s) return () => {};
      const handler = (payload) => onSosPayload(payload);
      for (const evt of SOS_SOCKET_EVENTS) s.on(evt, handler);
      return () => {
        for (const evt of SOS_SOCKET_EVENTS) s.off(evt, handler);
      };
    };

    let detach = attach(socket);
    const onConnect = () => {
      detach?.();
      detach = attach(getSocket());
    };
    socket?.on?.('connect', onConnect);

    return () => {
      socket?.off?.('connect', onConnect);
      detach?.();
    };
  }, [isAuthenticated, token, onSosPayload]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const params = extractEmergencyRouteParams(response.notification.request.content.data);
      if (!params) return;
      if (user?.role === 'admin') return;
      openEmergencyBooking(params.patientId);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const params = extractEmergencyRouteParams(response.notification.request.content.data);
      if (!params || user?.role === 'admin') return;
      openEmergencyBooking(params.patientId);
    });

    return () => sub.remove();
  }, [openEmergencyBooking, user?.role]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        stopEmergencyAlarm().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <EmergencyAlertContext.Provider value={{ openEmergencyBooking }}>
      {children}
    </EmergencyAlertContext.Provider>
  );
}

export function useEmergencyAlerts() {
  return useContext(EmergencyAlertContext);
}
