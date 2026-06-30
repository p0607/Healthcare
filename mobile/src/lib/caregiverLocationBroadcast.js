import * as Location from 'expo-location';

import { resolveCaregiverGpsCoordinates } from '@nursecare/shared';

import { api } from '../api/client';

import { connectSocket, getSocket } from './socket';

const MIN_MOVE_METERS = 45;
const MIN_SAVE_MS = 20_000;
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
 * Watch caregiver GPS and broadcast live position to active visit rooms (on_the_way / in_progress).
 */
export function startCaregiverLocationBroadcast({
  enabled = true,
  getActiveRequests = () => [],
  getSavedCoordinates = () => null,
  trackingStatuses = ['on_the_way', 'in_progress'],
} = {}) {
  if (!enabled) return () => {};

  let subscription = null;
  let lastCoords = null;
  let lastSaveAt = 0;
  let lastSocketAt = 0;
  let saving = false;
  let cancelled = false;

  const persistLocation = async (coordinates) => {
    if (saving) return;
    const saved = getSavedCoordinates?.();
    const resolved = resolveCaregiverGpsCoordinates(saved, coordinates[0], coordinates[1]);
    if (!resolved) return;

    saving = true;
    try {
      await api.patch('/nurses/me/location', {
        location: { coordinates: [resolved.lng, resolved.lat] },
      });
    } catch {
      /* non-fatal */
    } finally {
      saving = false;
    }
  };

  const onPosition = async (pos) => {
    const raw = [pos.coords.longitude, pos.coords.latitude];
    const saved = getSavedCoordinates?.();
    const resolved = resolveCaregiverGpsCoordinates(saved, raw[0], raw[1]);
    if (!resolved) return;

    const coordinates = [resolved.lng, resolved.lat];
    const now = Date.now();
    const moved =
      !lastCoords || haversineMeters(lastCoords, coordinates) >= MIN_MOVE_METERS;
    const shouldSave = moved || now - lastSaveAt >= MIN_SAVE_MS;

    const socket = getSocket();
    if (socket?.connected && now - lastSocketAt >= SOCKET_EMIT_MS) {
      lastSocketAt = now;
      getActiveRequests()
        .filter((r) => trackingStatuses.includes(r.status))
        .forEach((r) => {
          socket.emit('nurse:location', { requestId: r._id, coordinates });
        });
    }

    if (!shouldSave) return;
    lastSaveAt = now;
    lastCoords = coordinates;
    await persistLocation(coordinates);
  };

  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (cancelled || status !== 'granted') return;
    await connectSocket();
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 25,
        timeInterval: 5000,
      },
      (pos) => {
        onPosition(pos).catch(() => {});
      }
    );
  })().catch(() => {});

  return () => {
    cancelled = true;
    subscription?.remove();
    subscription = null;
  };
}
