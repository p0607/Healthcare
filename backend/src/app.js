const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { getCorsOrigins } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { publicApiLimiter } = require('./middleware/rateLimit');
const { checkHealth } = require('./lib/health');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const nurseRoutes = require('./routes/nurses');
const careServiceRoutes = require('./routes/careServices');
const marketingServiceRoutes = require('./routes/marketingServices');
const bookingCategoryRoutes = require('./routes/bookingCategories');
const adminRoutes = require('./routes/admin');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payments');

const careCtrl = require('./controllers/careServiceController');
const marketingCtrl = require('./controllers/marketingServiceController');
const bookingCategoryCtrl = require('./controllers/bookingCategoryController');

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
app.use('/api/requests', requestRoutes);
app.use('/api/nurses', nurseRoutes);
app.get('/api/care-services/available-types', publicApiLimiter, careCtrl.listAvailableTypes);
app.get('/api/care-services', publicApiLimiter, careCtrl.listPublic);
app.use('/api/care-services', careServiceRoutes);
app.get('/api/marketing-services', publicApiLimiter, marketingCtrl.listPublic);
app.use('/api/marketing-services', marketingServiceRoutes);
app.get('/api/booking-categories', publicApiLimiter, bookingCategoryCtrl.listPublic);
app.use('/api/booking-categories', bookingCategoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
