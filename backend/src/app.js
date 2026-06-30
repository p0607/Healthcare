const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { getCorsOrigins } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { publicApiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const nurseRoutes = require('./routes/nurses');
const careServiceRoutes = require('./routes/careServices');
const marketingServiceRoutes = require('./routes/marketingServices');
const bookingCategoryRoutes = require('./routes/bookingCategories');
const adminRoutes = require('./routes/admin');
const cartRoutes = require('./routes/cart');
const careCtrl = require('./controllers/careServiceController');
const marketingCtrl = require('./controllers/marketingServiceController');
const bookingCategoryCtrl = require('./controllers/bookingCategoryController');
const nurseCtrl = require('./controllers/nurseController');
const authCtrl = require('./controllers/authController');
const cartCtrl = require('./controllers/cartController');
const { protect, authorize } = require('./middleware/auth');
const { checkHealth } = require('./lib/health');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', async (req, res) => {
  try {
    const health = await checkHealth();
    res.status(health.ok ? 200 : 503).json(health);
  } catch {
    res.status(503).json({ ok: false, db: 'down', ts: Date.now() });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
/** Explicit POST so emergency SOS works even if the auth sub-router is stale on a long-running process. */
app.post('/api/auth/me/emergency-alert', protect, authCtrl.triggerEmergencyAlert);
app.post('/api/auth/me/push-token', protect, authCtrl.registerPushToken);
app.get('/api/auth/me/patients', protect, authCtrl.getLinkedPatients);
app.get('/api/auth/me/patients/:patientId', protect, authCtrl.getLinkedPatientProfile);
app.patch('/api/auth/me/patients/:patientId/profile', protect, authCtrl.updateLinkedPatientProfile);
app.patch('/api/auth/me/guardian-account', protect, authCtrl.updateGuardianAccount);
app.use('/api/requests', requestRoutes);
app.get('/api/nurses/available', publicApiLimiter, nurseCtrl.listAvailableAt);
app.use('/api/nurses', nurseRoutes);
/** Public checklist for patient “Visit focus” — explicit GET so it never falls through to 404 if the sub-router fails to attach. */
app.get('/api/care-services/available-types', publicApiLimiter, careCtrl.listAvailableTypes);
app.get('/api/care-services', publicApiLimiter, careCtrl.listPublic);
app.use('/api/care-services', careServiceRoutes);
app.get('/api/marketing-services', publicApiLimiter, marketingCtrl.listPublic);
app.use('/api/marketing-services', marketingServiceRoutes);
app.get('/api/booking-categories', publicApiLimiter, bookingCategoryCtrl.listPublic);
app.use('/api/booking-categories', bookingCategoryRoutes);
app.use('/api/cart', cartRoutes);
/** Explicit cart routes so sync works even if the sub-router is stale on a long-running process. */
app.get('/api/cart/me', protect, authorize('user'), cartCtrl.getMyCart);
app.put('/api/cart/me', protect, authorize('user'), cartCtrl.saveMyCart);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
