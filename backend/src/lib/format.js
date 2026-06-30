/**
 * Translates flat Prisma rows into the shape the frontend expects:
 *   - `_id`               instead of `id`
 *   - `location.coordinates: [lng, lat]`
 *   - never leaks `password`
 */

const toSafeUser = (u) => {
  if (!u) return u;
  const { password, lng, lat, address, id, nurseCareOfferings, ...rest } = u;
  const out = {
    _id: id,
    ...rest,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
      address: address || '',
    },
  };
  if (out.certifications != null && typeof out.certifications === 'object') {
    out.certifications = Array.isArray(out.certifications) ? out.certifications : [];
  } else {
    out.certifications = [];
  }
  if (Array.isArray(nurseCareOfferings)) {
    out.careOfferings = nurseCareOfferings.map((row) => ({
      careServiceOptionId: row.careServiceOptionId,
      rate: row.rate,
      label: row.careServiceOption?.label ?? '',
      catalogRate: row.careServiceOption?.rate ?? 0,
      serviceType: row.careServiceOption?.serviceType ?? 'nurse_visit',
    }));
  }
  return out;
};

const toRequest = (r) => {
  if (!r) return r;
  const { id, lng, lat, address, user, nurse, userId, nurseId, ...rest } = r;
  return {
    _id: id,
    user: user ? toSafeUser(user) : userId,
    nurse: nurse ? toSafeUser(nurse) : nurseId || undefined,
    ...rest,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
      address: address || '',
    },
  };
};

module.exports = { toSafeUser, toRequest };
