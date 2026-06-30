/**
 * ComprehensiveHealthcareUserProfile — shared schema helpers for web + mobile.
 * Stored in User.healthProfile (JSON) with legacy flat fields kept in sync.
 */

export const MIN_EMERGENCY_CONTACTS = 1;
export const MAX_EMERGENCY_CONTACTS = 5;

export const SEX_AT_BIRTH_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Intersex', label: 'Intersex' },
  { value: 'Undisclosed', label: 'Undisclosed' },
];

export const BLOOD_TYPE_OPTIONS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Unknown',
];

export const ALLERGY_SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'];

export const EMPLOYMENT_STATUS_OPTIONS = [
  'Full-time',
  'Part-time',
  'Self-employed',
  'Unemployed',
  'Retired',
  'Student',
];

export const WORK_SCHEDULE_OPTIONS = [
  'Standard Day',
  'Night Shift',
  'Rotating/Irregular',
  'Flexible',
];

export const TOBACCO_USE_OPTIONS = ['Never', 'Former', 'Current'];
export const ALCOHOL_USE_OPTIONS = ['None', 'Occasional', 'Moderate', 'Heavy'];

export const POLICY_HOLDER_RELATION_OPTIONS = ['Spouse', 'Parent', 'Child', 'Other'];

export const COMPREHENSIVE_TIMELINE_STEPS = [
  {
    id: 'demographics',
    label: 'Demographics',
    shortLabel: 'Identity',
    sectionKey: 'demographics',
  },
  {
    id: 'guardians',
    label: 'Guardians',
    shortLabel: 'Guardian',
    sectionKey: 'guardians',
  },
  {
    id: 'emergencyContacts',
    label: 'Emergency contacts',
    shortLabel: 'Emergency',
    sectionKey: 'emergencyContacts',
  },
  {
    id: 'medicalBaseline',
    label: 'Medical baseline',
    shortLabel: 'Medical',
    sectionKey: 'medicalBaseline',
  },
  {
    id: 'employmentAndLifestyle',
    label: 'Employment & lifestyle',
    shortLabel: 'Lifestyle',
    sectionKey: 'employmentAndLifestyle',
  },
  {
    id: 'insuranceDetails',
    label: 'Insurance',
    shortLabel: 'Insurance',
    sectionKey: 'insuranceDetails',
  },
];

function trim(v) {
  return String(v ?? '').trim();
}

function splitFullName(full) {
  const parts = trim(full).split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function mapLegacyGenderToSex(gender) {
  const g = trim(gender).toLowerCase();
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  if (g === 'other') return 'Intersex';
  if (g === 'prefer_not_to_say') return 'Undisclosed';
  return '';
}

function mapSexToLegacyGender(sex) {
  const s = trim(sex);
  if (s === 'Male') return 'male';
  if (s === 'Female') return 'female';
  if (s === 'Intersex') return 'other';
  if (s === 'Undisclosed') return 'prefer_not_to_say';
  return null;
}

export function dobToInputValue(dob) {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function isMinor(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age < 18;
}

export function emptyGuardian() {
  return {
    fullName: '',
    relationshipToUser: '',
    phone: '',
    email: '',
    hasMedicalDecisionMakingAuthority: false,
    address: { street: '', city: '', state: '', zipCode: '' },
  };
}

export function emptyEmergencyContact(priorityOrder = 1) {
  return {
    fullName: '',
    relationship: '',
    primaryPhone: '',
    secondaryPhone: '',
    email: '',
    priorityOrder,
  };
}

export function emptyAllergy() {
  return { allergen: '', severity: '', reaction: '' };
}

export function emptyMedication() {
  return { name: '', dosage: '', frequency: '' };
}

export function emptyInsurancePolicy() {
  return {
    providerName: '',
    planName: '',
    policyId: '',
    groupId: '',
    isPrimaryHolder: true,
    primaryHolderDetails: { fullName: '', relationshipToUser: '', dateOfBirth: '' },
  };
}

export function defaultHealthProfile(userId = '') {
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
    emergencyContacts: [emptyEmergencyContact(1)],
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
    insuranceDetails: {
      hasInsurance: null,
      policies: [],
    },
  };
}

function normalizeEmergencyContactRow(row, index) {
  return {
    fullName: trim(row?.fullName || row?.name),
    relationship: trim(row?.relationship),
    primaryPhone: trim(row?.primaryPhone || row?.phone),
    secondaryPhone: trim(row?.secondaryPhone),
    email: trim(row?.email),
    priorityOrder: Number(row?.priorityOrder) > 0 ? Number(row.priorityOrder) : index + 1,
  };
}

export function normalizeEmergencyContacts(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const mapped = arr.map(normalizeEmergencyContactRow).slice(0, MAX_EMERGENCY_CONTACTS);
  if (!mapped.length) mapped.push(emptyEmergencyContact(1));
  return mapped;
}

function emergencyRowFilled(row) {
  return Boolean(row.fullName && row.relationship && row.primaryPhone && row.priorityOrder);
}

export function emergencyContactsComplete(contacts) {
  const rows = normalizeEmergencyContacts(contacts);
  const active = rows.filter(
    (r) => r.fullName || r.relationship || r.primaryPhone || r.email || r.secondaryPhone
  );
  if (!active.length) return false;
  return active.every(emergencyRowFilled);
}

function legacyEmergencyToSchema(contacts) {
  return normalizeEmergencyContacts(
    (contacts || []).map((c, i) => ({
      fullName: c.fullName || c.name,
      relationship: c.relationship,
      primaryPhone: c.primaryPhone || c.phone,
      secondaryPhone: c.secondaryPhone,
      email: c.email,
      priorityOrder: c.priorityOrder || i + 1,
    }))
  );
}

function schemaEmergencyToLegacy(contacts) {
  return normalizeEmergencyContacts(contacts).map((c) => ({
    name: c.fullName,
    phone: c.primaryPhone,
    email: c.email,
    relationship: c.relationship,
    primaryPhone: c.primaryPhone,
    secondaryPhone: c.secondaryPhone,
    fullName: c.fullName,
    priorityOrder: c.priorityOrder,
  }));
}

function guardianFromLegacy(user, linkedGuardian) {
  if (linkedGuardian?.id) {
    return [
      {
        fullName: trim(linkedGuardian.name),
        relationshipToUser: 'Legal Guardian',
        phone: trim(linkedGuardian.phone),
        email: trim(linkedGuardian.email),
        hasMedicalDecisionMakingAuthority: true,
        address: { street: '', city: '', state: '', zipCode: '' },
      },
    ];
  }
  if (user?.guardianContactName || user?.guardianContactPhone) {
    return [
      {
        fullName: trim(user.guardianContactName),
        relationshipToUser: 'Legal Guardian',
        phone: trim(user.guardianContactPhone),
        email: trim(user.guardianContactEmail),
        hasMedicalDecisionMakingAuthority: true,
        address: { street: '', city: '', state: '', zipCode: '' },
      },
    ];
  }
  return [];
}

export function parseHealthProfile(raw, userId = '') {
  const base = defaultHealthProfile(userId);
  if (!raw || typeof raw !== 'object') return base;
  const d = raw.demographics || {};
  const contact = d.contact || {};
  return {
    userId: trim(raw.userId || userId),
    demographics: {
      legalFirstName: trim(d.legalFirstName),
      legalLastName: trim(d.legalLastName),
      preferredName: trim(d.preferredName),
      dateOfBirth: trim(d.dateOfBirth),
      sexAssignedAtBirth: trim(d.sexAssignedAtBirth),
      genderIdentity: trim(d.genderIdentity),
      contact: {
        phone: trim(contact.phone),
        email: trim(contact.email),
      },
    },
    guardians: Array.isArray(raw.guardians)
      ? raw.guardians.map((g) => ({
          fullName: trim(g?.fullName),
          relationshipToUser: trim(g?.relationshipToUser),
          phone: trim(g?.phone),
          email: trim(g?.email),
          hasMedicalDecisionMakingAuthority: Boolean(g?.hasMedicalDecisionMakingAuthority),
          address: {
            street: trim(g?.address?.street),
            city: trim(g?.address?.city),
            state: trim(g?.address?.state),
            zipCode: trim(g?.address?.zipCode),
          },
        }))
      : [],
    emergencyContacts: legacyEmergencyToSchema(raw.emergencyContacts),
    medicalBaseline: {
      bloodType: trim(raw.medicalBaseline?.bloodType),
      allergies: Array.isArray(raw.medicalBaseline?.allergies)
        ? raw.medicalBaseline.allergies.map((a) => ({
            allergen: trim(a?.allergen),
            severity: trim(a?.severity),
            reaction: trim(a?.reaction),
          }))
        : [],
      chronicConditions: Array.isArray(raw.medicalBaseline?.chronicConditions)
        ? raw.medicalBaseline.chronicConditions.map((c) => trim(c)).filter(Boolean)
        : [],
      currentMedications: Array.isArray(raw.medicalBaseline?.currentMedications)
        ? raw.medicalBaseline.currentMedications.map((m) => ({
            name: trim(m?.name),
            dosage: trim(m?.dosage),
            frequency: trim(m?.frequency),
          }))
        : [],
    },
    employmentAndLifestyle: {
      employmentStatus: trim(raw.employmentAndLifestyle?.employmentStatus),
      occupation: trim(raw.employmentAndLifestyle?.occupation),
      workSchedule: trim(raw.employmentAndLifestyle?.workSchedule),
      lifestyleFactors: {
        tobaccoUse: trim(raw.employmentAndLifestyle?.lifestyleFactors?.tobaccoUse),
        alcoholUse: trim(raw.employmentAndLifestyle?.lifestyleFactors?.alcoholUse),
      },
    },
    insuranceDetails: {
      hasInsurance:
        raw.insuranceDetails?.hasInsurance === true
          ? true
          : raw.insuranceDetails?.hasInsurance === false
            ? false
            : null,
      policies: Array.isArray(raw.insuranceDetails?.policies)
        ? raw.insuranceDetails.policies.map((p) => ({
            providerName: trim(p?.providerName),
            planName: trim(p?.planName),
            policyId: trim(p?.policyId),
            groupId: trim(p?.groupId),
            isPrimaryHolder: Boolean(p?.isPrimaryHolder),
            primaryHolderDetails: {
              fullName: trim(p?.primaryHolderDetails?.fullName),
              relationshipToUser: trim(p?.primaryHolderDetails?.relationshipToUser),
              dateOfBirth: trim(p?.primaryHolderDetails?.dateOfBirth),
            },
          }))
        : [],
    },
  };
}

export function mergeHealthProfileFromUser(user, linkedGuardian = null) {
  const userId = user?._id || user?.id || '';
  const stored = parseHealthProfile(user?.healthProfile, userId);
  const linked = linkedGuardian ?? user?.linkedGuardian ?? null;

  const nameParts = splitFullName(user?.patientFullName || user?.name);
  const demographics = {
    ...stored.demographics,
    legalFirstName: stored.demographics.legalFirstName || nameParts.first,
    legalLastName: stored.demographics.legalLastName || nameParts.last,
    preferredName: stored.demographics.preferredName || trim(user?.name),
    dateOfBirth: stored.demographics.dateOfBirth || dobToInputValue(user?.patientDateOfBirth),
    sexAssignedAtBirth:
      stored.demographics.sexAssignedAtBirth || mapLegacyGenderToSex(user?.patientGender),
    contact: {
      phone: stored.demographics.contact.phone || trim(user?.phone),
      email: stored.demographics.contact.email || trim(user?.email),
    },
  };

  let guardians = stored.guardians.length ? stored.guardians : guardianFromLegacy(user, linked);
  let emergencyContacts = stored.emergencyContacts.some((c) => c.fullName || c.primaryPhone)
    ? stored.emergencyContacts
    : legacyEmergencyToSchema(user?.emergencyContacts);

  const insurance = { ...stored.insuranceDetails };
  if (insurance.hasInsurance === null && (user?.policyNumber || user?.policyholderName)) {
    insurance.hasInsurance = true;
  }
  if (!insurance.policies.length && user?.policyNumber) {
    insurance.policies = [
      {
        providerName: trim(user?.policyholderName),
        planName: '',
        policyId: trim(user?.policyNumber),
        groupId: trim(user?.healthCardId),
        isPrimaryHolder: user?.relationshipToPolicyholder === 'self',
        primaryHolderDetails: {
          fullName: trim(user?.policyholderName),
          relationshipToUser: trim(user?.relationshipToPolicyholder) || 'Other',
          dateOfBirth: '',
        },
      },
    ];
  }

  return {
    ...stored,
    userId,
    demographics,
    guardians,
    emergencyContacts,
    insuranceDetails: insurance,
    homeAddress: user?.location?.address || user?.address || '',
  };
}

function guardianFilled(guardian) {
  return Boolean(guardian.fullName && guardian.relationshipToUser && guardian.phone);
}

/** Enough info to auto-create a guardian login (name + email + phone). */
export function guardianProvisionReady(guardian) {
  return Boolean(trim(guardian?.fullName) && trim(guardian?.email) && trim(guardian?.phone));
}

export function guardiansComplete(profile, linkedGuardian = null) {
  const dob = profile?.demographics?.dateOfBirth;
  if (!isMinor(dob)) return true;
  if (linkedGuardian?.id) return true;
  const list = profile?.guardians || [];
  return list.some(guardianFilled);
}

export function demographicsComplete(profile) {
  const d = profile?.demographics || {};
  return Boolean(
    d.legalFirstName &&
      d.legalLastName &&
      d.dateOfBirth &&
      d.sexAssignedAtBirth &&
      trim(profile?.homeAddress)
  );
}

export function medicalBaselineComplete(profile) {
  const m = profile?.medicalBaseline;
  if (!m) return false;
  return Array.isArray(m.allergies) && Array.isArray(m.chronicConditions);
}

export function employmentComplete(profile) {
  const e = profile?.employmentAndLifestyle || {};
  return Boolean(
    e.employmentStatus ||
      e.occupation ||
      e.workSchedule ||
      e.lifestyleFactors?.tobaccoUse ||
      e.lifestyleFactors?.alcoholUse
  );
}

function policyFilled(p) {
  return Boolean(p.providerName && p.policyId && p.isPrimaryHolder != null);
}

export function insuranceComplete(profile) {
  const ins = profile?.insuranceDetails;
  if (!ins || ins.hasInsurance === null) return false;
  if (ins.hasInsurance === false) return true;
  return (ins.policies || []).some(policyFilled);
}

export function sectionCompletion(profile, linkedGuardian = null) {
  return {
    demographics: demographicsComplete(profile),
    guardians: guardiansComplete(profile, linkedGuardian),
    emergencyContacts: emergencyContactsComplete(profile.emergencyContacts),
    medicalBaseline: medicalBaselineComplete(profile),
    employmentAndLifestyle: employmentComplete(profile),
    insuranceDetails: insuranceComplete(profile),
  };
}

export function comprehensiveProfileCompletion(user, linkedGuardian = null) {
  const profile = mergeHealthProfileFromUser(user, linkedGuardian);
  const sections = sectionCompletion(profile, linkedGuardian);
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
    profile,
  };
}

export function timelineStepsFromCompletion(completion) {
  const sectionMap = completion?.sections || {};
  return COMPREHENSIVE_TIMELINE_STEPS.map((step) => {
    const filled = sectionMap[step.sectionKey] ? 1 : 0;
    const total = 1;
    const status = filled ? 'complete' : 'pending';
    return { ...step, filled, total, status, items: [] };
  });
}

export function formFromUser(user, linkedGuardian = null) {
  const profile = mergeHealthProfileFromUser(user, linkedGuardian);
  const linked = linkedGuardian ?? user?.linkedGuardian ?? null;
  return {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || profile.demographics.contact.phone || '',
    address: profile.homeAddress || '',
    healthProfile: profile,
    emergencyContacts: schemaEmergencyToLegacy(profile.emergencyContacts),
    guardianContactName: linked?.name || user?.guardianContactName || '',
    guardianContactEmail: linked?.email || user?.guardianContactEmail || '',
    guardianContactPhone: linked?.phone || user?.guardianContactPhone || '',
    policyholderName: user?.policyholderName || '',
    policyNumber: user?.policyNumber || '',
    healthCardId: user?.healthCardId || '',
    patientFullName: user?.patientFullName || '',
    patientDateOfBirth: dobToInputValue(user?.patientDateOfBirth),
    patientGender: user?.patientGender || '',
    relationshipToPolicyholder: user?.relationshipToPolicyholder || '',
  };
}

export function buildHealthProfilePayload(form, userId = '') {
  const hp = form?.healthProfile || defaultHealthProfile(userId);
  const d = hp.demographics || {};
  const ins = hp.insuranceDetails || { hasInsurance: null, policies: [] };
  const primaryPolicy = ins.policies?.[0];

  return {
    healthProfile: {
      userId: userId || hp.userId,
      demographics: {
        ...d,
        contact: {
          phone: trim(form.phone || d.contact?.phone),
          email: trim(form.email || d.contact?.email),
        },
      },
      guardians: Array.isArray(hp.guardians) ? hp.guardians : [],
      emergencyContacts: normalizeEmergencyContacts(hp.emergencyContacts),
      medicalBaseline: hp.medicalBaseline || defaultHealthProfile().medicalBaseline,
      employmentAndLifestyle: hp.employmentAndLifestyle || defaultHealthProfile().employmentAndLifestyle,
      insuranceDetails: ins,
    },
    name: trim(form.name) || trim(d.preferredName) || `${trim(d.legalFirstName)} ${trim(d.legalLastName)}`.trim(),
    phone: trim(form.phone || d.contact?.phone),
    address: trim(form.address),
    patientFullName:
      `${trim(d.legalFirstName)} ${trim(d.legalLastName)}`.trim() || trim(form.patientFullName),
    patientDateOfBirth: d.dateOfBirth || form.patientDateOfBirth || null,
    patientGender: mapSexToLegacyGender(d.sexAssignedAtBirth) || form.patientGender || null,
    emergencyContacts: schemaEmergencyToLegacy(hp.emergencyContacts),
    policyholderName: primaryPolicy?.providerName || trim(form.policyholderName),
    policyNumber: primaryPolicy?.policyId || trim(form.policyNumber),
    healthCardId: primaryPolicy?.groupId || trim(form.healthCardId),
    relationshipToPolicyholder:
      primaryPolicy?.primaryHolderDetails?.relationshipToUser ||
      form.relationshipToPolicyholder ||
      null,
    guardianContactName: trim(hp.guardians?.[0]?.fullName) || trim(form.guardianContactName),
    guardianContactEmail: trim(hp.guardians?.[0]?.email) || trim(form.guardianContactEmail),
    guardianContactPhone: trim(hp.guardians?.[0]?.phone) || trim(form.guardianContactPhone),
  };
}

export function visibleEmergencyContactCount(contacts) {
  const rows = normalizeEmergencyContacts(contacts);
  let n = MIN_EMERGENCY_CONTACTS;
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.fullName || r.primaryPhone || r.relationship || r.email) {
      n = Math.max(n, i + 1);
      break;
    }
  }
  return Math.min(n, MAX_EMERGENCY_CONTACTS);
}

export function isPatientSession(user) {
  const kinds = user?.accountKinds || [];
  if (kinds.includes('patient')) return true;
  return user?.activeKind === 'patient' || (!kinds.length && user?.role === 'user');
}

export function isGuardianSession(user) {
  if (!user) return false;
  if (user.activeKind === 'guardian') return true;
  if (user.activeKind === 'patient') return false;
  const kinds = user?.accountKinds || [];
  return kinds.includes('guardian');
}

export function guardianAlsoPatient(user) {
  return Boolean(user?.accountKinds?.includes?.('patient'));
}

/** Tab ids for guardian profile screen: self, my-patient, patient:{id}. */
export function buildGuardianProfileTabs(user, linkedPatients = []) {
  const tabs = [{ id: 'self', label: 'Your profile' }];
  if (guardianAlsoPatient(user)) {
    tabs.push({ id: 'my-patient', label: 'Patient profile' });
  }
  for (const p of linkedPatients) {
    const display = p.patientFullName?.trim() || p.name?.trim() || 'Patient';
    tabs.push({
      id: `patient:${p.id || p._id}`,
      label: `${display}'s profile`,
      patientId: p.id || p._id,
    });
  }
  return tabs;
}
