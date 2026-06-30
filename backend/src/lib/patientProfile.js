const {
  normalizeEmergencyContacts,
  emergencyContactsComplete,
  MIN_REQUIRED,
  MAX_SLOTS,
} = require('./emergencyContacts');

const RELATIONSHIPS = ['self', 'spouse', 'child', 'parent', 'other'];
const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];
const SEX_VALUES = ['Male', 'Female', 'Intersex', 'Undisclosed'];

const COMPREHENSIVE_TIMELINE_STEPS = [
  { id: 'demographics', sectionKey: 'demographics', label: 'Demographics' },
  { id: 'guardians', sectionKey: 'guardians', label: 'Guardians' },
  { id: 'emergencyContacts', sectionKey: 'emergencyContacts', label: 'Emergency contacts' },
  { id: 'medicalBaseline', sectionKey: 'medicalBaseline', label: 'Medical baseline' },
  { id: 'employmentAndLifestyle', sectionKey: 'employmentAndLifestyle', label: 'Employment & lifestyle' },
  { id: 'insuranceDetails', sectionKey: 'insuranceDetails', label: 'Insurance' },
];

function trimOrNull(v) {
  const s = String(v ?? '').trim();
  return s || null;
}

function parseDob(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function mapSexToLegacyGender(sex) {
  const s = trimOrNull(sex);
  if (s === 'Male') return 'male';
  if (s === 'Female') return 'female';
  if (s === 'Intersex') return 'other';
  if (s === 'Undisclosed') return 'prefer_not_to_say';
  return null;
}

function defaultHealthProfile(userId = '') {
  return {
    userId: userId || '',
    demographics: {
      legalFirstName: '',
      legalLastName: '',
      preferredName: '',
      dateOfBirth: '',
      sexAssignedAtBirth: '',
      genderIdentity: '',
      contact: { phone: '', email: '' },
    },
    guardians: [],
    emergencyContacts: [],
    medicalBaseline: {
      bloodType: '',
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
    },
    employmentAndLifestyle: {
      employmentStatus: '',
      occupation: '',
      workSchedule: '',
      lifestyleFactors: { tobaccoUse: '', alcoholUse: '' },
    },
    insuranceDetails: { hasInsurance: null, policies: [] },
  };
}

function parseHealthProfile(raw, userId = '') {
  const base = defaultHealthProfile(userId);
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    demographics: { ...base.demographics, ...(raw.demographics || {}) },
    medicalBaseline: { ...base.medicalBaseline, ...(raw.medicalBaseline || {}) },
    employmentAndLifestyle: {
      ...base.employmentAndLifestyle,
      ...(raw.employmentAndLifestyle || {}),
    },
    insuranceDetails: { ...base.insuranceDetails, ...(raw.insuranceDetails || {}) },
  };
}

function syncLegacyFromHealthProfile(hp, data) {
  const d = hp?.demographics || {};
  if (d.legalFirstName || d.legalLastName) {
    data.patientFullName = trimOrNull(`${d.legalFirstName || ''} ${d.legalLastName || ''}`.trim());
  }
  if (d.dateOfBirth) {
    const dob = parseDob(d.dateOfBirth);
    if (dob !== undefined) data.patientDateOfBirth = dob;
  }
  if (d.sexAssignedAtBirth) {
    data.patientGender = mapSexToLegacyGender(d.sexAssignedAtBirth);
  }
  if (d.contact?.phone) data.phone = trimOrNull(d.contact.phone);
  const policy = hp?.insuranceDetails?.policies?.[0];
  if (policy) {
    if (policy.providerName) data.policyholderName = trimOrNull(policy.providerName);
    if (policy.policyId) data.policyNumber = trimOrNull(policy.policyId);
    if (policy.groupId) data.healthCardId = trimOrNull(policy.groupId);
  }
  const guardian = hp?.guardians?.[0];
  if (guardian) {
    if (guardian.fullName) data.guardianContactName = trimOrNull(guardian.fullName);
    if (guardian.email) data.guardianContactEmail = trimOrNull(guardian.email)?.toLowerCase() || null;
    if (guardian.phone) data.guardianContactPhone = trimOrNull(guardian.phone);
  }
  if (Array.isArray(hp?.emergencyContacts) && hp.emergencyContacts.length) {
    data.emergencyContacts = normalizeEmergencyContacts(
      hp.emergencyContacts.map((c, i) => ({
        name: c.fullName || c.name,
        phone: c.primaryPhone || c.phone,
        email: c.email,
        relationship: c.relationship,
        priorityOrder: c.priorityOrder || i + 1,
      }))
    );
  }
}

function buildPatientProfileData(body) {
  const data = {};
  if (body.healthProfile !== undefined) {
    const hp = parseHealthProfile(body.healthProfile, body.userId);
    data.healthProfile = hp;
    syncLegacyFromHealthProfile(hp, data);
  }
  if (body.policyholderName !== undefined) data.policyholderName = trimOrNull(body.policyholderName);
  if (body.policyNumber !== undefined) data.policyNumber = trimOrNull(body.policyNumber);
  if (body.healthCardId !== undefined) data.healthCardId = trimOrNull(body.healthCardId);
  if (body.patientFullName !== undefined) data.patientFullName = trimOrNull(body.patientFullName);
  if (body.patientGender !== undefined) {
    const g = trimOrNull(body.patientGender)?.toLowerCase();
    if (g && !GENDERS.includes(g)) {
      const err = new Error(`Gender must be one of: ${GENDERS.join(', ')}`);
      err.code = 'INVALID_GENDER';
      throw err;
    }
    data.patientGender = g;
  }
  if (body.relationshipToPolicyholder !== undefined) {
    const r = trimOrNull(body.relationshipToPolicyholder)?.toLowerCase();
    if (r && !RELATIONSHIPS.includes(r)) {
      const err = new Error(`Relationship must be one of: ${RELATIONSHIPS.join(', ')}`);
      err.code = 'INVALID_RELATIONSHIP';
      throw err;
    }
    data.relationshipToPolicyholder = r;
  }
  if (body.patientDateOfBirth !== undefined) {
    const dob = parseDob(body.patientDateOfBirth);
    if (dob === undefined) {
      const err = new Error('Invalid date of birth');
      err.code = 'INVALID_DOB';
      throw err;
    }
    data.patientDateOfBirth = dob;
  }
  if (body.phone !== undefined) data.phone = trimOrNull(body.phone);
  if (body.name !== undefined) data.name = trimOrNull(body.name);
  if (body.emergencyContacts !== undefined) {
    data.emergencyContacts = normalizeEmergencyContacts(body.emergencyContacts);
  }
  if (body.guardianContactName !== undefined) {
    data.guardianContactName = trimOrNull(body.guardianContactName);
  }
  if (body.guardianContactEmail !== undefined) {
    data.guardianContactEmail = trimOrNull(body.guardianContactEmail)?.toLowerCase() || null;
  }
  if (body.guardianContactPhone !== undefined) {
    data.guardianContactPhone = trimOrNull(body.guardianContactPhone);
  }
  if (body.location !== undefined) {
    const addr = trimOrNull(body.location?.address);
    if (addr !== null) data.address = addr;
    if (body.location?.coordinates?.length === 2) {
      data.lng = Number(body.location.coordinates[0]);
      data.lat = Number(body.location.coordinates[1]);
    }
  }
  return data;
}

function isMinor(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age < 18;
}

function guardianContactFilled(user, linkedGuardian) {
  if (linkedGuardian?.id) return true;
  const hp = parseHealthProfile(user?.healthProfile, user?.id);
  if ((hp.guardians || []).some((g) => g.fullName && g.relationshipToUser && g.phone)) return true;
  return Boolean(
    user?.guardianContactName &&
      user?.guardianContactEmail &&
      user?.guardianContactPhone
  );
}

function demographicsComplete(user) {
  const hp = parseHealthProfile(user?.healthProfile, user?.id);
  const d = hp.demographics || {};
  const dob = d.dateOfBirth || user?.patientDateOfBirth;
  const first = d.legalFirstName || (user?.patientFullName || '').split(' ')[0];
  const last =
    d.legalLastName || (user?.patientFullName || '').split(' ').slice(1).join(' ');
  const sex = d.sexAssignedAtBirth || user?.patientGender;
  return Boolean(
    trimOrNull(first) &&
      trimOrNull(last) &&
      dob &&
      (trimOrNull(sex) || trimOrNull(user?.patientGender)) &&
      trimOrNull(user?.address)
  );
}

function insuranceComplete(user) {
  const hp = parseHealthProfile(user?.healthProfile, user?.id);
  const ins = hp.insuranceDetails || {};
  if (ins.hasInsurance === false) return true;
  if (ins.hasInsurance === true) {
    return (ins.policies || []).some((p) => p.providerName && p.policyId);
  }
  return Boolean(user?.policyNumber && user?.policyholderName);
}

function employmentComplete(user) {
  const hp = parseHealthProfile(user?.healthProfile, user?.id);
  const e = hp.employmentAndLifestyle || {};
  return Boolean(
    e.employmentStatus ||
      e.occupation ||
      e.workSchedule ||
      e.lifestyleFactors?.tobaccoUse ||
      e.lifestyleFactors?.alcoholUse
  );
}

function medicalComplete(user) {
  const hp = parseHealthProfile(user?.healthProfile, user?.id);
  return Boolean(hp.medicalBaseline);
}

function patientProfileCompletion(user, linkedGuardian = null) {
  const emergency = normalizeEmergencyContacts(user?.emergencyContacts);
  const sections = {
    demographics: demographicsComplete(user),
    guardians: !isMinor(user?.patientDateOfBirth) || guardianContactFilled(user, linkedGuardian),
    emergencyContacts: emergencyContactsComplete(emergency),
    medicalBaseline: medicalComplete(user),
    employmentAndLifestyle: employmentComplete(user),
    insuranceDetails: insuranceComplete(user),
  };
  const fields = COMPREHENSIVE_TIMELINE_STEPS.map((step) => ({
    key: step.sectionKey,
    label: step.label,
    filled: sections[step.sectionKey],
  }));
  const filled = fields.filter((f) => f.filled).length;
  const total = fields.length;
  return {
    filled,
    total,
    pending: total - filled,
    percent: Math.round((filled / total) * 100),
    fields,
    sections,
  };
}

module.exports = {
  RELATIONSHIPS,
  GENDERS,
  SEX_VALUES,
  MIN_REQUIRED,
  MAX_SLOTS,
  buildPatientProfileData,
  patientProfileCompletion,
  normalizeEmergencyContacts,
  parseHealthProfile,
};
