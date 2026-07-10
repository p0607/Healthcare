/** Prisma default seed location (Bengaluru) — used for demo caregivers. */
export const DEFAULT_SEED_COORDS = [77.5946, 12.9716];

/**
 * Nurse live tracking: GPS coordinates only (free). DB persist on this interval.
 * Reverse geocoding is skipped during live tracking to avoid map API / Nominatim load.
 */
export const CAREGIVER_LIVE_LOCATION_INTERVAL_MS = 3 * 60 * 1000;

/** Socket broadcast interval for live patient map (Zomato-style movement). */
export const CAREGIVER_SOCKET_EMIT_INTERVAL_MS = 5_000;

/** GPS watch distance filter while actively tracking a visit. */
export const CAREGIVER_GPS_WATCH_DISTANCE_M = 12;

/** Minimum movement before an early save is considered (still capped by interval). */
export const CAREGIVER_MIN_MOVE_METERS = 45;

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
 * Allows replacing the Bengaluru seed with a real India fix anywhere in the country.
 */
export function shouldRejectCaregiverGpsUpdate(savedCoords, lng, lat, { maxJumpKm = 500 } = {}) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return true;
  if (isLikelyEmulatorDefault(lng, lat)) return true;

  const newInIndia = isInsideIndia(lng, lat);
  if (!newInIndia) return true;

  const savedValid =
    Array.isArray(savedCoords) &&
    savedCoords.length >= 2 &&
    Number.isFinite(savedCoords[0]) &&
    Number.isFinite(savedCoords[1]);

  if (!savedValid) return false;

  // First real GPS fix: replace default Bengaluru seed anywhere in India.
  if (isDefaultSeedLocation(savedCoords)) return false;

  const savedInIndia = isInsideIndia(savedCoords[0], savedCoords[1]);
  if (!savedInIndia) return false;

  const jumpKm = distanceMeters(savedCoords, [lng, lat]) / 1000;
  if (jumpKm <= maxJumpKm) return false;

  return jumpKm > 2000;
}

export function caregiverGpsRejectMessage() {
  return 'GPS location looks invalid. Enable location services and try again.';
}

/**
 * Use device GPS when valid. Demo Bengaluru fallback is opt-in (emulator/dev only).
 * Returns null when coords look like a bad jump and demo fallback is disabled.
 */
export function resolveCaregiverGpsCoordinates(
  savedCoords,
  lng,
  lat,
  { allowDemoFallback = false } = {}
) {
  if (!shouldRejectCaregiverGpsUpdate(savedCoords, lng, lat)) {
    return { lng, lat, usedDemoFallback: false };
  }

  if (allowDemoFallback && isMisplacedCaregiverCoords(lng, lat)) {
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
