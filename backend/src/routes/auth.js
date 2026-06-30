const router = require('express').Router();
const {
  register,
  login,
  me,
  checkPatientByEmail,
  getPatientGuardian,
  getLinkedPatients,
  getLinkedPatientProfile,
  updateLinkedPatientProfile,
  updateGuardianAccount,
  updatePatientProfile,
  changePassword,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  deactivateAccount,
  triggerEmergencyAlert,
  registerPushToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  authLimiter,
  registerLimiter,
  checkPatientLimiter,
  otpLimiter,
} = require('../middleware/rateLimit');

router.post('/register', registerLimiter, register);
router.post('/check-patient', checkPatientLimiter, checkPatientByEmail);
router.post('/login', authLimiter, login);
router.post('/forgot-password', otpLimiter, requestPasswordResetOtp);
router.post('/reset-password', otpLimiter, resetPasswordWithOtp);
router.get('/me', protect, me);
router.get('/me/guardian', protect, getPatientGuardian);
router.get('/me/patients', protect, getLinkedPatients);
router.get('/me/patients/:patientId', protect, getLinkedPatientProfile);
router.patch('/me/patients/:patientId/profile', protect, updateLinkedPatientProfile);
router.patch('/me/guardian-account', protect, updateGuardianAccount);
router.post('/me/emergency-alert', protect, triggerEmergencyAlert);
router.post('/me/push-token', protect, registerPushToken);
router.patch('/me/profile', protect, updatePatientProfile);
router.patch('/change-password', protect, changePassword);
router.post('/deactivate-account', protect, deactivateAccount);

module.exports = router;
