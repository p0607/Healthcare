/** Socket event for patient SOS alerts (guardians, admins, linked emergency contacts). */
export const SOS_SOCKET_EVENT = 'sos:emergency_alert';

/** @deprecated Use SOS_SOCKET_EVENT — kept for older clients. */
export const SOS_LEGACY_GUARDIAN_EVENT = 'guardian:emergency_alert';

export const SOS_NOTIFICATION_CHANNEL_ID = 'emergency-sos';

export const SOS_DEEP_LINK_PATH = '/(app)/book/emergency';

export function sosAlertTitle(patientName) {
  return `SOS — ${patientName || 'Patient'} needs help`;
}

export function sosAlertBody(payload) {
  return payload?.message || 'A patient triggered the emergency button. Tap to book emergency response.';
}
