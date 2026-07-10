const { haversineKm } = require('./geo');

const SEED_LNG = 77.5946;
const SEED_LAT = 12.9716;

function isInsideIndia(lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  return lng >= 68 && lng <= 98 && lat >= 6 && lat <= 37;
}

function isLikelyEmulatorDefault(lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  return lng >= -125 && lng <= -70 && lat >= 25 && lat <= 50;
}

function isMisplacedCaregiverCoords(lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return true;
  return !isInsideIndia(lng, lat) || isLikelyEmulatorDefault(lng, lat);
}

function rejectCaregiverLocationUpdate(prevLng, prevLat, lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return { reject: true, message: 'Invalid coordinates' };
  }

  if (isLikelyEmulatorDefault(lng, lat)) {
    return {
      reject: true,
      message:
        'GPS location looks invalid (common on emulators). Set mock location to your city, then try again.',
    };
  }

  const newInIndia = isInsideIndia(lng, lat);
  if (!newInIndia) {
    return { reject: true, message: 'GPS location must be within India.' };
  }

  if (!Number.isFinite(prevLng) || !Number.isFinite(prevLat)) {
    return { reject: false };
  }

  const nearSeed = haversineKm(prevLng, prevLat, SEED_LNG, SEED_LAT) < 0.15;
  if (nearSeed) {
    return { reject: false };
  }

  const prevInIndia = isInsideIndia(prevLng, prevLat);
  if (!prevInIndia) {
    return { reject: false };
  }

  const jumpKm = haversineKm(prevLng, prevLat, lng, lat);
  if (jumpKm > 2000) {
    return { reject: true, message: 'Location change is too large to accept automatically.' };
  }

  return { reject: false };
}

function normalizeCaregiverCoords(prevLng, prevLat, lng, lat) {
  const check = rejectCaregiverLocationUpdate(prevLng, prevLat, lng, lat);
  if (!check.reject) {
    return { lng, lat, demoFallback: false };
  }

  if (process.env.NODE_ENV !== 'production' && isMisplacedCaregiverCoords(lng, lat)) {
    return { lng: SEED_LNG, lat: SEED_LAT, demoFallback: true };
  }

  return { reject: true, message: check.message };
}

async function repairMisplacedCaregivers(prisma) {
  const nurses = await prisma.user.findMany({
    where: { role: 'nurse' },
    select: { id: true, email: true, name: true, lng: true, lat: true },
  });

  let reset = 0;
  for (const n of nurses) {
    if (!isMisplacedCaregiverCoords(n.lng, n.lat)) continue;
    await prisma.user.update({
      where: { id: n.id },
      data: { lng: SEED_LNG, lat: SEED_LAT },
    });
    console.log(`  repaired caregiver location: ${n.email} (${n.name})`);
    reset += 1;
  }
  return reset;
}

module.exports = {
  SEED_LNG,
  SEED_LAT,
  isInsideIndia,
  isMisplacedCaregiverCoords,
  rejectCaregiverLocationUpdate,
  normalizeCaregiverCoords,
  repairMisplacedCaregivers,
};
