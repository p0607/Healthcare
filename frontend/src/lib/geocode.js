/**
 * OpenStreetMap Nominatim (demo). Debounce searches in the UI (see LocationSearch).
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  /** Identifying the app is required by Nominatim usage policy */
  'User-Agent': 'NurseCare-PatientApp/1.0',
};
const PHOTON_HEADERS = { Accept: 'application/json' };

const nominatimDelay = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Build a full postal-style line from Nominatim `addressdetails`, prioritising
 * neighbourhood / suburb / district so the label is not just the city name.
 */
export function formatStructuredAddress(addr) {
  if (!addr || typeof addr !== 'object') return '';

  const seen = new Set();
  const pushUnique = (arr, val) => {
    const t = (val || '').toString().trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    arr.push(t);
  };

  const parts = [];

  pushUnique(parts, addr.building);
  pushUnique(parts, addr.apartments);

  const streetLine = [addr.house_number, addr.house_name, addr.road || addr.pedestrian || addr.path || addr.residential]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  pushUnique(parts, streetLine);

  pushUnique(parts, addr.neighbourhood);
  pushUnique(parts, addr.suburb);
  pushUnique(parts, addr.locality);
  pushUnique(parts, addr.quarter);
  pushUnique(parts, addr.city_block);

  pushUnique(parts, addr.hamlet);
  pushUnique(parts, addr.village);

  pushUnique(parts, addr.city_district);
  if (
    addr.district &&
    addr.district.toLowerCase() !== (addr.city_district || '').toLowerCase() &&
    addr.district.toLowerCase() !== (addr.city || addr.town || '').toLowerCase()
  ) {
    pushUnique(parts, addr.district);
  }

  const settlement = addr.city || addr.town || addr.municipality;
  pushUnique(parts, settlement);

  pushUnique(parts, addr.state);
  pushUnique(parts, addr.postcode);
  pushUnique(parts, addr.country);

  return parts.join(', ');
}

/** Best label for reverse lookup: display_name usually includes suburb / POI OSM omits from structured fields. */
export function reverseAddressLine(data) {
  if (!data || data.error) return '';
  const display = (data.display_name || '').trim();
  const structured = formatStructuredAddress(data.address);
  if (!display) return structured;
  if (!structured) return display;
  return display.length >= structured.length ? display : structured;
}

function reverseLooksBarebones(label) {
  if (!label?.trim()) return true;
  const parts = label.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length < 4 || label.length < 38;
}

async function nominatimReverseRaw(lng, lat, zoom) {
  const params = new URLSearchParams({
    format: 'json',
    lon: String(lng),
    lat: String(lat),
    addressdetails: '1',
    zoom: String(zoom),
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: NOMINATIM_HEADERS,
  });

  if (!res.ok) throw new Error('Reverse geocode failed');
  return res.json();
}

/** Prefer structured address when it contains street/area detail; otherwise keep Nominatim display_name if richer. */
export function pickPlaceLabel(item) {
  if (!item) return '';
  if (item.error) return '';

  const name = (item.name || item.namedetails?.name || '').trim();
  const display = (item.display_name || '').trim();
  const structured = formatStructuredAddress(item.address);

  if (name) {
    const localityParts = [
      item.address?.neighbourhood,
      item.address?.suburb,
      item.address?.city_district,
      item.address?.city || item.address?.town,
      item.address?.state,
      item.address?.postcode,
    ].filter(Boolean);
    const locality = [...new Set(localityParts.map((p) => p.trim()))].join(', ');

    if (structured.toLowerCase().includes(name.toLowerCase())) return structured;
    if (locality) return `${name}, ${locality}`;
    if (structured) return `${name}, ${structured}`;
    return name;
  }

  if (!structured) return display;
  if (!display) return structured;

  const addr = item.address || {};
  const hasLocalDetail =
    !!(addr.house_number ||
      addr.road ||
      addr.pedestrian ||
      addr.path ||
      addr.building ||
      addr.apartments ||
      addr.neighbourhood ||
      addr.suburb ||
      addr.locality ||
      addr.quarter ||
      addr.city_block ||
      addr.hamlet ||
      addr.city_district);

  if (hasLocalDetail) return structured;

  const sp = structured.split(',').map((s) => s.trim()).filter(Boolean).length;
  const dp = display.split(',').map((s) => s.trim()).filter(Boolean).length;
  if (dp > sp) return display;
  return structured;
}

export function placeResultParts(item) {
  const label = pickPlaceLabel(item);
  const name = (item?.name || item?.namedetails?.name || '').trim();
  if (name) {
    const subtitle = label.toLowerCase().startsWith(name.toLowerCase())
      ? label.slice(name.length).replace(/^,\s*/, '')
      : label;
    return { title: name, subtitle };
  }
  const parts = label.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    title: parts[0] || label,
    subtitle: parts.slice(1).join(', '),
  };
}

function extractBuildingName(item) {
  const name = (item?.name || item?.namedetails?.name || '').trim();
  const cls = item?.class || '';
  const type = item?.type || '';
  const isNamedPlace =
    cls === 'building' ||
    cls === 'amenity' ||
    cls === 'office' ||
    cls === 'shop' ||
    type === 'apartments' ||
    type === 'commercial' ||
    type === 'residential' ||
    type === 'hotel';

  if (name && isNamedPlace) return name;
  return item?.address?.building || item?.address?.apartments || item?.address?.house_name || '';
}

function scorePlaceResult(item, query) {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const name = (item.name || item.namedetails?.name || '').toLowerCase();
  const label = pickPlaceLabel(item).toLowerCase();
  const cls = item.class || '';
  const type = item.type || '';

  let score = Number(item.importance || 0) * 3;

  if (name === q) score += 40;
  else if (name.startsWith(q)) score += 28;
  else if (name.includes(q)) score += 18;

  if (label.includes(q)) score += 12;

  const matchedTokens = tokens.filter((t) => name.includes(t) || label.includes(t)).length;
  score += matchedTokens * 6;

  if (cls === 'building' || type === 'apartments' || type === 'commercial') score += 14;
  if (cls === 'amenity' || cls === 'office') score += 10;
  if (cls === 'place' && type === 'house') score += 4;

  return score;
}

function scorePhotonResult(item, query) {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const name = (item.name || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const subtitle = (item.subtitle || '').toLowerCase();
  const label = `${title}, ${subtitle}`.toLowerCase();
  const placeType = (item.placeType || '').toLowerCase();

  let score = 8;
  if (name === q) score += 34;
  else if (name.startsWith(q)) score += 24;
  else if (name.includes(q)) score += 14;

  if (title.includes(q)) score += 16;
  if (label.includes(q)) score += 10;

  const matchedTokens = tokens.filter((t) => name.includes(t) || label.includes(t)).length;
  score += matchedTokens * 5;

  if (placeType.includes('building') || placeType.includes('apartments')) score += 12;
  if (placeType.includes('commercial') || placeType.includes('residential')) score += 10;
  return score;
}

function mapSearchResult(item) {
  const { title, subtitle } = placeResultParts(item);
  return {
    id: String(item.place_id),
    label: pickPlaceLabel(item),
    title,
    subtitle,
    lng: parseFloat(item.lon),
    lat: parseFloat(item.lat),
    pincode: item.address?.postcode || '',
    buildingName: extractBuildingName(item),
    placeClass: item.class || '',
    placeType: item.type || '',
  };
}

function photonAddressLabel(props = {}) {
  const parts = [];
  const push = (v) => {
    const t = String(v || '').trim();
    if (t && !parts.includes(t)) parts.push(t);
  };
  const street = [props.housenumber, props.street].filter(Boolean).join(' ').trim();
  push(props.name);
  push(street);
  push(props.district);
  push(props.city || props.county || props.state_district);
  push(props.state);
  push(props.postcode);
  push(props.country);
  return parts.join(', ');
}

function mapPhotonResult(feature) {
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];
  const title = (props.name || props.street || '').trim() || 'Address';
  const subtitleParts = [
    [props.housenumber, props.street].filter(Boolean).join(' ').trim(),
    props.district,
    props.city || props.county || props.state_district,
    props.state,
    props.postcode,
  ].filter(Boolean);
  const subtitle = [...new Set(subtitleParts.map((p) => p.trim()))].join(', ');
  const label = photonAddressLabel(props) || [title, subtitle].filter(Boolean).join(', ');
  const buildingName =
    props.osm_key === 'building' || props.osm_value === 'apartments' || props.osm_value === 'residential'
      ? props.name || ''
      : '';

  return {
    id: String(feature?.properties?.osm_id || feature?.id || Math.random()),
    label,
    title,
    subtitle,
    lng: Number(coords[0]),
    lat: Number(coords[1]),
    pincode: props.postcode || '',
    buildingName,
    placeClass: props.osm_key || '',
    placeType: props.osm_value || props.type || '',
    name: props.name || '',
    source: 'photon',
  };
}

async function searchNominatimPlaces(query) {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '12',
    addressdetails: '1',
    namedetails: '1',
    dedupe: '1',
    countrycodes: 'in',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: NOMINATIM_HEADERS,
  });
  if (!res.ok) throw new Error('Nominatim search failed');
  const data = await res.json();
  return data.map((item) => ({
    ...mapSearchResult(item),
    source: 'nominatim',
    _score: scorePlaceResult(item, query),
  }));
}

async function searchPhotonPlaces(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '10',
    lang: 'en',
    'location_bias_scale': '0.2',
  });
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
    headers: PHOTON_HEADERS,
  });
  if (!res.ok) throw new Error('Photon search failed');
  const data = await res.json();
  const features = Array.isArray(data?.features) ? data.features : [];
  return features
    .map(mapPhotonResult)
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
    .map((r) => ({ ...r, _score: scorePhotonResult(r, query) }));
}

export async function searchPlaces(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const [nominatim, photon] = await Promise.allSettled([searchNominatimPlaces(q), searchPhotonPlaces(q)]);
  const merged = [
    ...(nominatim.status === 'fulfilled' ? nominatim.value : []),
    ...(photon.status === 'fulfilled' ? photon.value : []),
  ]
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, 16);

  const seen = new Set();
  return merged
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
    .filter((row) => {
      const key = `${row.lat.toFixed(5)}:${row.lng.toFixed(5)}:${String(row.title || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map(({ _score, ...row }) => row)
    .filter((row) => {
      if (!row.title && !row.label) return false;
      if (!row.label) row.label = [row.title, row.subtitle].filter(Boolean).join(', ');
      return true;
    });
}

export async function reverseGeocode(lng, lat) {
  const primary = await nominatimReverseRaw(lng, lat, 18);
  let label = reverseAddressLine(primary);

  if (!reverseLooksBarebones(label)) return label;

  await nominatimDelay(1100);
  try {
    const fallback = await nominatimReverseRaw(lng, lat, 12);
    const alt = reverseAddressLine(fallback);
    return alt.length > label.length ? alt : label;
  } catch {
    return label;
  }
}
