/**
 * Address search + reverse geocode via OpenStreetMap (Nominatim).
 * Patient address picker only — nurse live tracking sends coordinates without geocoding.
 */

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Care360-Mobile/1.0',
};

export async function searchPlaces(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    format: 'json',
    q,
    limit: '8',
    addressdetails: '1',
    countrycodes: 'in',
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: NOMINATIM_HEADERS,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .filter((item) => item.lat && item.lon)
      .map((item) => ({
        id: String(item.place_id),
        label: item.display_name || q,
        lng: parseFloat(item.lon),
        lat: parseFloat(item.lat),
        pincode: item.address?.postcode || '',
        buildingName: item.address?.building || item.address?.apartments || '',
      }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lng, lat) {
  const params = new URLSearchParams({
    format: 'json',
    lon: String(lng),
    lat: String(lat),
    addressdetails: '1',
    zoom: '18',
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: NOMINATIM_HEADERS,
    });
    if (!res.ok) return '';
    const data = await res.json();
    return (data.display_name || '').trim();
  } catch {
    return '';
  }
}
