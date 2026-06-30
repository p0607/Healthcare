import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import useHealthcareFallAlerts from './useHealthcareFallAlerts.js';
import {
  alertStableId,
  filterAlertsForViewer,
  laymanAlertSummary,
  laymanAlertTitle,
  loadAckIds,
  pushBrowserNotification,
  requestBrowserNotificationPermission,
} from './fallAlertUtils.js';

const HealthcareFallAlertsContext = createContext(null);

/** Single WebSocket + poll connection shared by banner and dashboard. */
export function HealthcareFallAlertsProvider({ children }) {
  const { user } = useAuth();
  const value = useHealthcareFallAlerts();
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (user) requestBrowserNotificationPermission();
  }, [user]);

  const relevantActive = useMemo(() => {
    if (!user) return [];
    const ackIds = loadAckIds();
    return filterAlertsForViewer(value.alerts, user)
      .map((a, idx) => ({ ...a, _id: alertStableId(a, idx) }))
      .filter((a) => !ackIds.has(a._id));
  }, [value.alerts, user]);

  useEffect(() => {
    if (!user || relevantActive.length === 0) return;
    const top = relevantActive[0];
    if (notifiedRef.current.has(top._id)) return;
    notifiedRef.current.add(top._id);

    const title = laymanAlertTitle(top);
    const summary = laymanAlertSummary(top);

    pushBrowserNotification(top, title);
    toast.error(`${title}\n${summary}`, {
      id: top._id,
      duration: 12000,
      style: { maxWidth: '420px', whiteSpace: 'pre-line' },
    });
  }, [relevantActive, user]);

  return (
    <HealthcareFallAlertsContext.Provider value={value}>{children}</HealthcareFallAlertsContext.Provider>
  );
}

export function useHealthcareFallAlertsContext() {
  const ctx = useContext(HealthcareFallAlertsContext);
  if (!ctx) {
    throw new Error('useHealthcareFallAlertsContext must be used inside HealthcareFallAlertsProvider');
  }
  return ctx;
}
