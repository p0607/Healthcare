import * as Location from 'expo-location';

import {
  CAREGIVER_GPS_WATCH_DISTANCE_M,
  CAREGIVER_LIVE_LOCATION_INTERVAL_MS,
  CAREGIVER_SOCKET_EMIT_INTERVAL_MS,
  resolveCaregiverGpsCoordinates,
} from '@nursecare/shared';

import { api } from '../api/client';

import { connectSocket, getSocket } from './socket';

/**
 * Watch caregiver GPS and broadcast live coordinates to active visit rooms.
 * Coordinates only — no reverse geocoding during live tracking (every 3 minutes).
 */
export function startCaregiverLocationBroadcast({
  enabled = true,
  getActiveRequests = () => [],
  getSavedCoordinates = () => null,
  trackingStatuses = ['on_the_way', 'in_progress'],
} = {}) {
  if (!enabled) return () => {};

  let subscription = null;
  let lastSaveAt = 0;
  let lastSocketAt = 0;
  let saving = false;
  let cancelled = false;

  const persistLocation = async (coordinates) => {
    if (saving) return;
    const saved = getSavedCoordinates?.();
    const resolved = resolveCaregiverGpsCoordinates(saved, coordinates[0], coordinates[1], {
      allowDemoFallback: __DEV__,
    });
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
    const resolved = resolveCaregiverGpsCoordinates(saved, raw[0], raw[1], {
      allowDemoFallback: __DEV__,
    });
    if (!resolved) return;

    const coordinates = [resolved.lng, resolved.lat];
    const now = Date.now();
    const shouldSave = now - lastSaveAt >= CAREGIVER_LIVE_LOCATION_INTERVAL_MS;

    const socket = getSocket();
    if (socket?.connected && now - lastSocketAt >= CAREGIVER_SOCKET_EMIT_INTERVAL_MS) {
      lastSocketAt = now;
      getActiveRequests()
        .filter((r) => trackingStatuses.includes(r.status))
        .forEach((r) => {
          socket.emit('nurse:location', { requestId: r._id, coordinates });
        });
    }

    if (!shouldSave) return;
    lastSaveAt = now;
    await persistLocation(coordinates);
  };

  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (cancelled || status !== 'granted') return;
    await connectSocket();
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: CAREGIVER_GPS_WATCH_DISTANCE_M,
        timeInterval: CAREGIVER_SOCKET_EMIT_INTERVAL_MS,
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
