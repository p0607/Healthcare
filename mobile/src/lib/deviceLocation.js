import { Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  DEFAULT_SEED_COORDS,
  demoIndiaPosition,
  distanceMeters as sharedDistanceMeters,
  isDefaultSeedLocation as sharedIsDefaultSeedLocation,
  shouldRejectCaregiverGpsUpdate,
} from '@nursecare/shared';

const GPS_TIMEOUT_MS = 15000;
const PREFERRED_ACCURACY_M = 150;
const MAX_ACCEPTABLE_ACCURACY_M = 2000;

/** Prisma default seed location — not a real GPS fix. */
export { DEFAULT_SEED_COORDS };

const EMULATOR_HINT =
  'On the Android emulator, open Extended controls → Location, set a point, then tap Send.';

function hasValidCoords(coords) {
  if (!coords) return false;
  const { latitude: lat, longitude: lng } = coords;
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

function isAccurateEnough(pos, maxMeters = PREFERRED_ACCURACY_M) {
  const accuracyM = pos?.coords?.accuracy;
  if (!Number.isFinite(accuracyM)) return true;
  return accuracyM <= maxMeters;
}

async function prepareLocationServices() {
  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    throw new Error('Turn on location services on this device.');
  }
  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      /* optional on some builds */
    }
  }
}

async function readLastKnown(maxAgeMs = 120_000) {
  const last = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs });
  return hasValidCoords(last?.coords) ? last : null;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs)
    ),
  ]);
}

async function readCurrent(accuracy, timeoutMs) {
  return withTimeout(
    Location.getCurrentPositionAsync({ accuracy }),
    timeoutMs
  );
}

/**
 * Collect watch updates and return the most accurate fix within the window.
 * Helps emulators without taking the first coarse network reading.
 */
function readViaWatch(timeoutMs, accuracy = Location.Accuracy.High) {
  return new Promise((resolve, reject) => {
    let subscription = null;
    let done = false;
    let best = null;

    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subscription?.remove();
      fn(value);
    };

    const timer = setTimeout(() => {
      if (best) finish(resolve, best);
      else finish(reject, new Error('timeout'));
    }, timeoutMs);

    Location.watchPositionAsync(
      {
        accuracy,
        distanceInterval: 0,
        timeInterval: 500,
      },
      (pos) => {
        if (!hasValidCoords(pos?.coords)) return;
        const nextAcc = pos.coords.accuracy ?? Infinity;
        const bestAcc = best?.coords?.accuracy ?? Infinity;
        if (!best || nextAcc < bestAcc) best = pos;
        if (isAccurateEnough(pos)) finish(resolve, pos);
      }
    )
      .then((sub) => {
        subscription = sub;
      })
      .catch((err) => finish(reject, err));
  });
}

/**
 * Read a stable device fix. Prefers high-accuracy GPS; accepts coarse fixes when needed.
 * With demoFallback, returns Bengaluru coords instead of throwing (emulator / timeout).
 */
export async function getDeviceCoordinates({
  timeoutMs = GPS_TIMEOUT_MS,
  demoFallback = false,
} = {}) {
  await prepareLocationServices();

  const attempts = [];

  try {
    const high = await readCurrent(Location.Accuracy.High, timeoutMs);
    attempts.push(high);
    if (isAccurateEnough(high)) return high;
  } catch {
    /* try next strategy */
  }

  try {
    const balanced = await readCurrent(
      Location.Accuracy.Balanced,
      Math.min(timeoutMs, 10000)
    );
    attempts.push(balanced);
    if (isAccurateEnough(balanced)) return balanced;
  } catch {
    /* try next strategy */
  }

  const quickMs = Math.min(timeoutMs, 10000);
  try {
    const watched = await readViaWatch(quickMs, Location.Accuracy.High);
    attempts.push(watched);
    if (isAccurateEnough(watched)) return watched;
  } catch {
    /* try next strategy */
  }

  const recent = await readLastKnown(120_000);
  if (recent) attempts.push(recent);

  try {
    const watchedBalanced = await readViaWatch(quickMs, Location.Accuracy.Balanced);
    attempts.push(watchedBalanced);
  } catch {
    /* try next strategy */
  }

  const stale = await readLastKnown();
  if (stale) attempts.push(stale);

  const validAttempts = attempts.filter((pos) => hasValidCoords(pos?.coords));
  if (validAttempts.length > 0) {
    validAttempts.sort(
      (a, b) => (a.coords.accuracy ?? Infinity) - (b.coords.accuracy ?? Infinity)
    );
    const best = validAttempts[0];
    if (isAccurateEnough(best, MAX_ACCEPTABLE_ACCURACY_M)) return best;
    if (demoFallback) return best;
  }

  if (demoFallback) {
    return demoIndiaPosition();
  }

  throw new Error(`Could not read GPS. ${EMULATOR_HINT}`);
}

/** Haversine distance in meters between two [lng, lat] points. */
export function distanceMeters(a, b) {
  return sharedDistanceMeters(a, b);
}

/** True when new coords differ from saved by at least minMeters. */
export function coordsChangedEnough(savedCoords, lng, lat, minMeters = 35) {
  if (!Array.isArray(savedCoords) || savedCoords.length < 2) return true;
  const [savedLng, savedLat] = savedCoords;
  if (!Number.isFinite(savedLng) || !Number.isFinite(savedLat)) return true;
  return distanceMeters([savedLng, savedLat], [lng, lat]) >= minMeters;
}

/** Format saved user.location.coordinates [lng, lat] for display. */
export function formatUserCoordinates(user, { decimals = 6 } = {}) {
  const coords = user?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return '—';
  const [lng, lat] = coords;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return '—';
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
}

/** True when the profile already has coordinates saved on the server. */
export function hasSavedUserCoordinates(user) {
  return formatUserCoordinates(user, { decimals: 4 }) !== '—';
}

/** True when coords are still the default Bengaluru seed (never GPS-updated). */
export function isDefaultSeedLocation(user) {
  const coords = user?.location?.coordinates;
  return sharedIsDefaultSeedLocation(coords);
}

export { shouldRejectCaregiverGpsUpdate };

export function formatAccuracyMeters(pos) {
  const accuracyM = pos?.coords?.accuracy;
  if (!Number.isFinite(accuracyM)) return null;
  return Math.round(accuracyM);
}
