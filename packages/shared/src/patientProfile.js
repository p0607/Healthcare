/**
 * Patient profile — re-exports comprehensive healthcare profile helpers.
 * Kept for backward compatibility with existing imports.
 */
export {
  MIN_EMERGENCY_CONTACTS,
  MAX_EMERGENCY_CONTACTS,
  SEX_AT_BIRTH_OPTIONS as GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  ALLERGY_SEVERITY_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  WORK_SCHEDULE_OPTIONS,
  TOBACCO_USE_OPTIONS,
  ALCOHOL_USE_OPTIONS,
  POLICY_HOLDER_RELATION_OPTIONS,
  COMPREHENSIVE_TIMELINE_STEPS as PROFILE_TIMELINE_STEPS,
  dobToInputValue,
  emptyGuardian,
  emptyEmergencyContact as emptyEmergencySlot,
  emptyAllergy,
  emptyMedication,
  emptyInsurancePolicy,
  defaultHealthProfile,
  normalizeEmergencyContacts,
  visibleEmergencyContactCount,
  emergencyContactsComplete,
  mergeHealthProfileFromUser,
  comprehensiveProfileCompletion as patientProfileCompletion,
  timelineStepsFromCompletion,
  formFromUser,
  buildHealthProfilePayload,
  isPatientSession,
  isGuardianSession,
  guardianAlsoPatient,
  buildGuardianProfileTabs,
  isMinor,
  sectionCompletion,
} from './comprehensiveProfile.js';

export const RELATIONSHIP_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'other', label: 'Other' },
];
