/**
 * Consumes fall-detection alerts from the Healthcare backend (WebSocket + HTTP fallback).
 * @see Healthcare app/external-client/README.md
 */
import { useEffect, useRef, useState } from 'react';
import { getHealthcareApiBase, getHealthcareWsBase, isHealthcareAlertsEnabled } from './healthcareConfig.js';

const HISTORY_LIMIT = 200;
const POLL_FALLBACK_MS = 5000;
const POLL_OFFLINE_MS = 30000;
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;
const MAX_WS_ATTEMPTS = 4;

export default function useHealthcareFallAlerts(options = {}) {
  const enabled = options.enabled ?? isHealthcareAlertsEnabled();
  const baseApi = options.apiBase || getHealthcareApiBase();
  const baseWs = options.wsBase || getHealthcareWsBase(baseApi);

  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState(enabled ? 'connecting' : 'disabled');
  const [error, setError] = useState('');
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setAlerts([]);
      setStatus('disabled');
      setError('');
      return undefined;
    }

    let cancelled = false;

    const mergeAlert = (incoming) => {
      if (!incoming || !incoming.timestamp) return;
      setAlerts((prev) => {
        if (prev.some((a) => a.id === incoming.id)) return prev;
        const next = [incoming, ...prev];
        next.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return next.slice(0, HISTORY_LIMIT);
      });
    };

    const loadHistory = async () => {
      const res = await fetch(`${baseApi}/live-alerts?limit=${HISTORY_LIMIT}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!cancelled && Array.isArray(data)) {
        setAlerts(data);
        setError('');
      }
    };

    const startPolling = (offline = false) => {
      if (pollTimerRef.current) return;
      setStatus(offline ? 'offline' : 'polling');
      const intervalMs = offline ? POLL_OFFLINE_MS : POLL_FALLBACK_MS;

      const tick = async () => {
        try {
          await loadHistory();
          if (!cancelled) {
            setStatus('polling');
            setError('');
          }
        } catch {
          if (!cancelled) {
            setStatus('offline');
            setError('Healthcare alerts server unavailable');
          }
        }
      };

      tick();
      pollTimerRef.current = setInterval(tick, intervalMs);
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const openWs = () => {
      if (cancelled || reconnectAttemptsRef.current >= MAX_WS_ATTEMPTS) {
        startPolling(true);
        return;
      }

      let ws;
      try {
        ws = new WebSocket(baseWs);
      } catch {
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;
      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        setStatus('live');
        setError('');
        reconnectAttemptsRef.current = 0;
        stopPolling();
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'fall_alert') mergeAlert(msg.data);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onerror = () => {
        if (!cancelled) setError('Healthcare alerts server unavailable');
      };
      ws.onclose = () => {
        if (cancelled) return;
        wsRef.current = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimerRef.current) return;

      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current >= MAX_WS_ATTEMPTS) {
        startPolling(true);
        return;
      }

      const delay = Math.min(RECONNECT_BASE_MS * 1.6 ** reconnectAttemptsRef.current, RECONNECT_MAX_MS);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        openWs();
      }, delay);
    };

    loadHistory()
      .then(() => {
        if (!cancelled) openWs();
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('offline');
          setError('Healthcare alerts server unavailable');
          startPolling(true);
        }
      });

    return () => {
      cancelled = true;
      stopPolling();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [baseApi, baseWs, enabled]);

  return { alerts, status, error };
}
