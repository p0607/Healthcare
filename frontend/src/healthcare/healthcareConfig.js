/** Set `VITE_HEALTHCARE_ALERTS_ENABLED=false` in `.env` when the Healthcare app on :4000 is not running. */
export function isHealthcareAlertsEnabled() {
  const flag = String(import.meta.env.VITE_HEALTHCARE_ALERTS_ENABLED ?? '').trim().toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'off';
}

/** Healthcare fall-detection backend (separate Express app on port 4000 by default). */
export function getHealthcareApiBase() {
  return import.meta.env.VITE_HEALTHCARE_API_BASE || 'http://localhost:4000/api';
}

export function getHealthcareWsBase(apiBase) {
  const base = apiBase || getHealthcareApiBase();
  try {
    const u = new URL(base);
    const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${u.host}/ws/alerts`;
  } catch {
    return 'ws://localhost:4000/ws/alerts';
  }
}
