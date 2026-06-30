const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

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
      coords: r.geometry.coordinates,
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
    };
  } catch {
    return straightLine(from, to);
  }
}

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

export function formatEta(min) {
  if (!Number.isFinite(min) || min < 0) return '—';
  if (min < 1) return '< 1 min';
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}
