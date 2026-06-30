/** Prisma default seed location (Bengaluru) — used for demo caregivers. */
export const DEFAULT_SEED_COORDS = [77.5946, 12.9716];

export function distanceMeters(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) return Infinity;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  if (!Number.isFinite(lng1) || !Number.isFinite(lat1) || !Number.isFinite(lng2) || !Number.isFinite(lat2)) {
    return Infinity;
  }
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const dist =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(dist));
}

export function isInsideIndia(lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  return lng >= 68 && lng <= 98 && lat >= 6 && lat <= 37;
}

/** Common Android emulator default (Google HQ / US west). */
export function isLikelyEmulatorDefault(lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  return lng >= -125 && lng <= -70 && lat >= 25 && lat <= 50;
}

export function isDefaultSeedLocation(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return true;
  return distanceMeters(coords, DEFAULT_SEED_COORDS) < 100;
}

export function isMisplacedCaregiverCoords(lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return true;
  return !isInsideIndia(lng, lat) || isLikelyEmulatorDefault(lng, lat);
}

/**
 * Reject GPS updates that would teleport or corrupt caregiver location (emulator US default).
 * Allows repairing an already-corrupted profile with valid India GPS.
 */
export function shouldRejectCaregiverGpsUpdate(savedCoords, lng, lat, { maxJumpKm = 500 } = {}) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return true;

  const savedValid =
    Array.isArray(savedCoords) &&
    savedCoords.length >= 2 &&
    Number.isFinite(savedCoords[0]) &&
    Number.isFinite(savedCoords[1]);
  const savedInIndia = savedValid && isInsideIndia(savedCoords[0], savedCoords[1]);
  const newInIndia = isInsideIndia(lng, lat);

  if (!savedInIndia && newInIndia && !isLikelyEmulatorDefault(lng, lat)) {
    return false;
  }

  if (!newInIndia || isLikelyEmulatorDefault(lng, lat)) return true;

  if (!savedValid) return false;

  const jumpKm = distanceMeters(savedCoords, [lng, lat]) / 1000;
  if (jumpKm <= maxJumpKm) return false;
  return isDefaultSeedLocation(savedCoords) || jumpKm > 2000;
}

export function caregiverGpsRejectMessage() {
  return 'GPS location looks invalid (common on emulators). Set mock location to Bengaluru (12.9716, 77.5946) in Extended controls → Location, then refresh.';
}

/**
 * Use device GPS when valid; otherwise fall back to Bengaluru demo coords (emulator US default).
 * Returns null only when coords look valid but the jump is too large to accept.
 */
export function resolveCaregiverGpsCoordinates(savedCoords, lng, lat) {
  if (!shouldRejectCaregiverGpsUpdate(savedCoords, lng, lat)) {
    return { lng, lat, usedDemoFallback: false };
  }

  if (isMisplacedCaregiverCoords(lng, lat)) {
    return {
      lng: DEFAULT_SEED_COORDS[0],
      lat: DEFAULT_SEED_COORDS[1],
      usedDemoFallback: true,
    };
  }

  return null;
}

/** Snap invalid/out-of-India GPS to Bengaluru demo coords (patients + address picker). */
export function resolveDemoIndiaCoordinates(lng, lat) {
  if (isMisplacedCaregiverCoords(lng, lat)) {
    return {
      lng: DEFAULT_SEED_COORDS[0],
      lat: DEFAULT_SEED_COORDS[1],
      usedDemoFallback: true,
    };
  }
  return { lng, lat, usedDemoFallback: false };
}

export function demoIndiaPosition() {
  return {
    coords: {
      longitude: DEFAULT_SEED_COORDS[0],
      latitude: DEFAULT_SEED_COORDS[1],
      accuracy: 100,
    },
    timestamp: Date.now(),
  };
}
