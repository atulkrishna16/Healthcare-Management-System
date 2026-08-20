const rateLimit = require('express-rate-limit');

/**
 * Global rate limiter applied to all incoming API requests.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Generous limit for demo & dev testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.',
    status: 429,
  },
  skip: (req) => req.path === '/health',
});

/**
 * Auth rate limiter for login/register endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Generous limit for testing & demo accounts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please wait a few moments before trying again.',
    status: 429,
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
