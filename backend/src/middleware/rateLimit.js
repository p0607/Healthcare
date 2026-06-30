const rateLimit = require('express-rate-limit');

const jsonMessage = (message) => ({ message });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many login attempts. Try again in 15 minutes.'),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many registration attempts. Try again later.'),
});

const checkPatientLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many lookup attempts. Try again later.'),
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many OTP requests. Try again in 10 minutes.'),
});

const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many requests. Slow down.'),
});

module.exports = {
  authLimiter,
  registerLimiter,
  checkPatientLimiter,
  otpLimiter,
  publicApiLimiter,
};
