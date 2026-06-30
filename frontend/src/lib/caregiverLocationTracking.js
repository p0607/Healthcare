import { api } from './api';
import { reverseGeocode } from './geocode';
import { getSocket } from './socket';
import { resolveCaregiverGpsCoordinates } from '@nursecare/shared';

const MIN_MOVE_METERS = 45;
const MIN_SAVE_MS = 20_000;
const MIN_GEOCODE_MS = 45_000;
const SOCKET_EMIT_MS = 5_000;

function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Watch device GPS, persist lng/lat + reverse-geocoded address on the caregiver profile,
 * and broadcast live position on active visits.
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
  let lastCoords = null;
  let lastSaveAt = 0;
  let lastGeocodeAt = 0;
  let lastSocketAt = 0;
  let saving = false;
  let lastAddress = null;

  const persistLocation = async (coordinates, address, savedCoords) => {
    if (saving) return;
    const resolved = resolveCaregiverGpsCoordinates(savedCoords, coordinates[0], coordinates[1]);
    if (!resolved) {
      console.warn('caregiver location save skipped: GPS jump too large');
      return;
    }
    saving = true;
    try {
      const payload = {
        location: { coordinates: [resolved.lng, resolved.lat] },
      };
      if (address != null) payload.location.address = address;
      const { data } = await api.patch('/nurses/me/location', payload);
      if (data?.user) onPersisted?.(data.user);
    } catch (err) {
      console.warn('caregiver location save:', err?.response?.data?.message || err.message);
    } finally {
      saving = false;
    }
  };

  const onPosition = async (pos) => {
    const saved = getSavedCoordinates?.();
    const resolved = resolveCaregiverGpsCoordinates(saved, pos.coords.longitude, pos.coords.latitude);
    if (!resolved) return;

    const coordinates = [resolved.lng, resolved.lat];
    onCoords?.(coordinates);

    const now = Date.now();
    const moved =
      !lastCoords || haversineMeters(lastCoords, coordinates) >= MIN_MOVE_METERS;
    const shouldSave = moved || now - lastSaveAt >= MIN_SAVE_MS;

    const socket = getSocket();
    if (socket && now - lastSocketAt >= SOCKET_EMIT_MS) {
      lastSocketAt = now;
      getAssigned()
        .filter((r) => gpsTrackingStatuses.includes(r.status))
        .forEach((r) => socket.emit('nurse:location', { requestId: r._id, coordinates }));
    }

    if (!shouldSave) return;

    let address = lastAddress;
    if (moved && now - lastGeocodeAt >= MIN_GEOCODE_MS) {
      lastGeocodeAt = now;
      try {
        address = await reverseGeocode(coordinates[0], coordinates[1]);
        lastAddress = address;
      } catch {
        /* keep previous address */
      }
    }

    lastSaveAt = now;
    lastCoords = coordinates;
    await persistLocation(coordinates, address, getSavedCoordinates());
  };

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onPosition(pos).catch(() => {});
    },
    (err) => console.warn('caregiver geolocation:', err.message),
    { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
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
