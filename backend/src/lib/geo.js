/**
 * Lightweight geo helpers. Postgres doesn't ship PostGIS by default, so we
 * compute a bounding box first (cheap, indexable) and then refine with the
 * Haversine formula (~accurate for short distances).
 */

const EARTH_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lng1, lat1, lng2, lat2) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Returns a bounding box [minLng, minLat, maxLng, maxLat] around (lng,lat). */
const bbox = (lng, lat, km) => {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos(toRad(lat)) || 1);
  return {
    minLng: lng - dLng,
    maxLng: lng + dLng,
    minLat: lat - dLat,
    maxLat: lat + dLat,
  };
};

module.exports = { haversineKm, bbox };
