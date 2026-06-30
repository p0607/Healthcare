const ACK_STORAGE_KEY = 'nc-fall-alerts-ack';

export function alertStableId(alert, index = 0) {
  return alert?.id || `${alert?.timestamp || ''}-${alert?.type || ''}-${alert?.source || ''}-${index}`;
}

export function loadAckIds() {
  try {
    const raw = localStorage.getItem(ACK_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveAckIds(set) {
  try {
    localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(Array.from(set).slice(-200)));
  } catch {
    /* ignore quota */
  }
}

/** Map 911 session to Healthcare `recipients` role string. */
export function resolveHealthcareRole(user) {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.role === 'nurse') return 'nurse';
  if (user.activeKind === 'guardian') return 'guardian';
  return 'user';
}

export function alertsDashboardPath(user) {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin/alerts';
  if (user.role === 'nurse') return '/nurse/alerts';
  return '/dashboard/alerts';
}

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function namesForUser(user) {
  const names = new Set();
  if (user?.name) names.add(norm(user.name));
  if (user?.patientFullName) names.add(norm(user.patientFullName));
  return names;
}

/** Filter alerts for the logged-in viewer (role + linked patient for guardians). */
export function filterAlertsForViewer(alerts, user) {
  const role = resolveHealthcareRole(user);
  if (!role) return [];

  const myNames = namesForUser(user);
  const myId = user?._id || user?.id;
  const activeKind = user?.activeKind || 'patient';

  const linkedNames = new Set();
  if (user?.linkedPatients?.length) {
    user.linkedPatients.forEach((p) => {
      if (p?.name) linkedNames.add(norm(p.name));
      if (p?.patientFullName) linkedNames.add(norm(p.patientFullName));
    });
  }

  const alertAboutPatient = (alert) => {
    if (alert.userId && myId && alert.userId === myId) return true;
    if (alert.userName && myNames.size && myNames.has(norm(alert.userName))) return true;
    return false;
  };

  const alertAboutLinkedPatient = (alert) => {
    if (alert.userId && user?.linkedPatientIds?.length) {
      return user.linkedPatientIds.includes(alert.userId);
    }
    if (alert.userName && linkedNames.size) {
      return linkedNames.has(norm(alert.userName));
    }
    return false;
  };

  return (alerts || []).filter((alert) => {
    const recipients = Array.isArray(alert.recipients) ? alert.recipients : [];

    if (role === 'admin') return true;

    if (role === 'user' && activeKind === 'patient' && alertAboutPatient(alert)) {
      return true;
    }

    if (role === 'guardian') {
      return alertAboutLinkedPatient(alert);
    }

    if (role === 'nurse') {
      return recipients.length === 0 || recipients.includes('nurse');
    }

    if (recipients.length === 0) return true;

    if (recipients.includes(role)) return true;
    if (role === 'user' && (recipients.includes('patient') || recipients.includes('user'))) {
      return alertAboutPatient(alert);
    }
    if (recipients.includes('contact') && role === 'user' && activeKind === 'patient') {
      return alertAboutPatient(alert);
    }

    return false;
  });
}

export function formatAlertTime(ts) {
  if (!ts) return 'Time unknown';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'Time unknown';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatAlertAge(ts) {
  const t = new Date(ts).getTime();
  if (!t) return '';
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 60) return `${secs} seconds ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return formatAlertTime(ts);
}

function deviceLabel(source) {
  const s = String(source || '').toLowerCase();
  if (s.includes('webcam') || s.includes('camera')) return 'home camera';
  if (s.includes('phone')) return 'phone sensor';
  if (s.includes('watch')) return 'smart watch';
  return source || 'home monitor';
}

/** Plain-language title for patients, guardians, and admins. */
export function laymanAlertTitle(alert) {
  const type = String(alert?.type || '').toUpperCase();
  const who = alert?.userName?.trim() || 'Someone at home';

  if (type === 'FALL') {
    return `${who} may have fallen — please check on them`;
  }
  if (type === 'UNCONSCIOUS') {
    return `${who} may be unconscious — get help immediately`;
  }
  if (type === 'RECOVERED') {
    return `${who} is back on their feet — situation looks better`;
  }
  if (alert?.headline) {
    return alert.headline.replace(/fall detected/i, 'may have fallen').replace(/-/g, ' — ');
  }
  return 'Home safety alert — please review';
}

export function laymanAlertSummary(alert) {
  const type = String(alert?.type || '').toUpperCase();
  const when = formatAlertAge(alert?.timestamp);
  const device = deviceLabel(alert?.source);
  const posture = alert?.posture ? ` They appear to be ${String(alert.posture).toLowerCase()}.` : '';

  if (type === 'FALL') {
    return `Detected ${when} by your ${device}.${posture} If you are nearby, check on the person right away.`;
  }
  if (type === 'UNCONSCIOUS') {
    return `Detected ${when} by your ${device}.${posture} Call emergency services if you cannot reach them.`;
  }
  if (type === 'RECOVERED') {
    return `Updated ${when}. The person seems to be moving normally again.`;
  }
  return `Reported ${when} from ${device}.${posture}`;
}

export function severityLabel(severity, type) {
  const sev = severity || (type === 'UNCONSCIOUS' ? 'critical' : type === 'FALL' ? 'warning' : 'info');
  if (sev === 'critical') return 'Urgent';
  if (sev === 'warning') return 'Important';
  return 'Update';
}

export function connectionStatusLabel(status) {
  if (status === 'live') return 'Connected — alerts arrive instantly';
  if (status === 'polling') return 'Checking every few seconds';
  if (status === 'connecting') return 'Connecting to safety monitor…';
  return 'Safety monitor offline — showing last known alerts';
}

export function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function pushBrowserNotification(alert, title) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title || laymanAlertTitle(alert), {
      body: laymanAlertSummary(alert).slice(0, 180),
      tag: alertStableId(alert),
    });
  } catch {
    /* ignore */
  }
}
