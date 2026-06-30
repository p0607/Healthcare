/**
 * Routing via OSRM's free public API. No key required.
 * Docs: https://project-osrm.org/docs/v5.24.0/api/
 *
 * In production, swap to your own OSRM instance, Mapbox Directions, or Google Directions.
 */

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

/**
 * @param {[number, number]} from  [lng, lat]
 * @param {[number, number]} to    [lng, lat]
 * @returns {Promise<null | { coords: [number,number][], distanceKm: number, durationMin: number }>}
 */
export async function getRoute(from, to) {
  if (!from || !to) return null;
  try {
    const url = `${OSRM_BASE}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    const r = data?.routes?.[0];
    if (!r) return null;
    return {
      coords: r.geometry.coordinates, // [[lng,lat], ...]
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
    };
  } catch (err) {
    console.warn('Route fetch failed, falling back to straight line:', err.message);
    return straightLine(from, to);
  }
}

/** Fallback when the routing API is unreachable. Uses Haversine for distance, 25 km/h for ETA. */
function straightLine(from, to) {
  const distanceKm = haversineKm(from, to);
  return {
    coords: [from, to],
    distanceKm,
    durationMin: (distanceKm / 25) * 60,
  };
}

export function haversineKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pretty-print a duration in minutes -> "12 min" or "1h 23m". */
export function formatEta(min) {
  if (!isFinite(min) || min < 0) return '—';
  if (min < 1) return '< 1 min';
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}
