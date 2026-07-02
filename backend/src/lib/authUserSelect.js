/**
 * Prisma select for JWT-protected routes — omits password hash and large healthProfile JSON.
 * Controllers that need the password or full profile re-fetch explicitly (e.g. changePassword, /auth/me).
 */
const PROTECT_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  adminTier: true,
  accountKinds: true,
  accountActive: true,
  caregiverCategory: true,
  serviceSectionId: true,
  specialization: true,
  licenseNumber: true,
  available: true,
  profilePhotoUrl: true,
  about: true,
  certifications: true,
  notifyNewJobs: true,
  notifySms: true,
  expoPushToken: true,
  rating: true,
  visitRate: true,
  payoutMethod: true,
  payoutAccountHolder: true,
  payoutBankName: true,
  payoutAccountNumber: true,
  payoutIfsc: true,
  payoutUpiId: true,
  policyholderName: true,
  policyNumber: true,
  healthCardId: true,
  patientFullName: true,
  patientDateOfBirth: true,
  patientGender: true,
  relationshipToPolicyholder: true,
  emergencyContacts: true,
  guardianContactName: true,
  guardianContactEmail: true,
  guardianContactPhone: true,
  lng: true,
  lat: true,
  address: true,
  createdAt: true,
  updatedAt: true,
};

/** Safe user fields embedded on service-request lists (no password / healthProfile). */
const REQUEST_PARTY_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  caregiverCategory: true,
  specialization: true,
  licenseNumber: true,
  rating: true,
  visitRate: true,
  available: true,
  profilePhotoUrl: true,
  certifications: true,
  lng: true,
  lat: true,
  address: true,
  nurseCareOfferings: {
    include: {
      careServiceOption: {
        select: { id: true, label: true, rate: true, serviceType: true, active: true },
      },
    },
  },
};

const REQUEST_INCLUDE = {
  user: { select: REQUEST_PARTY_SELECT },
  nurse: { select: REQUEST_PARTY_SELECT },
};

module.exports = { PROTECT_USER_SELECT, REQUEST_PARTY_SELECT, REQUEST_INCLUDE };
