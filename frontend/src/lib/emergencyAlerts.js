const SOS_NAV_EVENT = 'nc:sos_alert';
let alarmInterval = null;
let audioCtx = null;

export const SOS_SOCKET_EVENTS = ['sos:emergency_alert', 'guardian:emergency_alert'];

export async function ensureBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function stopSosAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
  }
}

/** Loud repeating beep using Web Audio (works when tab is open). */
export function playSosAlarm(durationMs = 15000) {
  stopSosAlarm();
  if (typeof window === 'undefined') return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = () => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.value = 0.35;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    };

    beep();
    alarmInterval = setInterval(beep, 700);
    setTimeout(stopSosAlarm, durationMs);
  } catch {
    /* ignore */
  }
}

export function showSosBrowserNotification(payload, onClick) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  const title = `SOS — ${payload?.patientName || 'Patient'}`;
  const body = payload?.message || 'Emergency button triggered. Tap to open emergency booking.';
  const notification = new Notification(title, {
    body,
    tag: `sos-${payload?.patientId || 'alert'}`,
    requireInteraction: true,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    onClick?.();
  };

  return notification;
}

export function dispatchSosNavigateEvent(payload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SOS_NAV_EVENT, { detail: payload }));
}

export function subscribeSosNavigate(handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = (e) => handler(e.detail);
  window.addEventListener(SOS_NAV_EVENT, listener);
  return () => window.removeEventListener(SOS_NAV_EVENT, listener);
}

export async function handleIncomingSosAlert(payload, { user, navigateToEmergency, showToast }) {
  if (!payload?.patientId || payload.patientId === user?.id) return;

  const isAdmin = user?.role === 'admin';
  const msg = payload?.message || 'A patient triggered the emergency button.';

  playSosAlarm();
  await ensureBrowserNotificationPermission();

  showSosBrowserNotification(payload, () => {
    stopSosAlarm();
    if (!isAdmin) {
      dispatchSosNavigateEvent(payload);
      navigateToEmergency?.();
    }
  });

  if (isAdmin) {
    showToast?.(`SOS: ${msg}`, { type: 'error', duration: 20000, id: 'admin-sos' });
    return;
  }

  showToast?.(`Emergency: ${msg}`, {
    type: 'error',
    duration: 20000,
    id: 'sos-emergency',
  });
}
