import { api } from './api';
import { getSocket } from './socket';
import {
  CAREGIVER_LIVE_LOCATION_INTERVAL_MS,
  CAREGIVER_SOCKET_EMIT_INTERVAL_MS,
  resolveCaregiverGpsCoordinates,
} from '@nursecare/shared';

/**
 * Watch device GPS, persist lng/lat on the caregiver profile, and broadcast live position.
 * Uses OpenStreetMap policy: no reverse-geocode during live tracking (coordinates only).
 * Updates are throttled to every 3 minutes for DB persistence; socket emits every 5s.
 */
export function startCaregiverLocationWatch({
  enabled = true,
  getAssigned = () => [],
  gpsTrackingStatuses = ['on_the_way', 'in_progress'],
  onCoords,
  onPersisted,
  getSavedCoordinates = () => null,
}) {
  if (!enabled || !navigator.geolocation) return () => {};

  let watchId = null;
  let lastSaveAt = 0;
  let lastSocketAt = 0;
  let saving = false;

  const persistLocation = async (coordinates, savedCoords) => {
    if (saving) return;
    const resolved = resolveCaregiverGpsCoordinates(savedCoords, coordinates[0], coordinates[1], {
      allowDemoFallback: false,
    });
    if (!resolved) {
      console.warn('caregiver location save skipped: GPS jump too large');
      return;
    }
    saving = true;
    try {
      const { data } = await api.patch('/nurses/me/location', {
        location: { coordinates: [resolved.lng, resolved.lat] },
      });
      if (data?.user) onPersisted?.(data.user);
    } catch (err) {
      console.warn('caregiver location save:', err?.response?.data?.message || err.message);
    } finally {
      saving = false;
    }
  };

  const onPosition = async (pos) => {
    const saved = getSavedCoordinates?.();
    const resolved = resolveCaregiverGpsCoordinates(saved, pos.coords.longitude, pos.coords.latitude, {
      allowDemoFallback: false,
    });
    if (!resolved) return;

    const coordinates = [resolved.lng, resolved.lat];
    onCoords?.(coordinates);

    const now = Date.now();
    const intervalElapsed = now - lastSaveAt >= CAREGIVER_LIVE_LOCATION_INTERVAL_MS;
    const shouldSave = intervalElapsed;

    const socket = getSocket();
    if (socket && now - lastSocketAt >= CAREGIVER_SOCKET_EMIT_INTERVAL_MS) {
      lastSocketAt = now;
      getAssigned()
        .filter((r) => gpsTrackingStatuses.includes(r.status))
        .forEach((r) => socket.emit('nurse:location', { requestId: r._id, coordinates }));
    }

    if (!shouldSave) return;

    lastSaveAt = now;
    await persistLocation(coordinates, getSavedCoordinates());
  };

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onPosition(pos).catch(() => {});
    },
    (err) => console.warn('caregiver geolocation:', err.message),
    { enableHighAccuracy: true, maximumAge: CAREGIVER_SOCKET_EMIT_INTERVAL_MS, timeout: 15000 }
  );

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onPosition(pos).catch(() => {});
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12000 }
  );

  return () => {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };
}
