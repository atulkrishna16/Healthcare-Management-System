const rateLimit = require('express-rate-limit');

/**
 * Global rate limiter applied to all incoming API requests.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Safe ceiling for general traffic
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down and try again shortly.',
    status: 429,
  },
  skip: (req) => req.path === '/health',
});

/**
 * Auth rate limiter for login/register endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 login/register requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please wait a few moments before trying again.',
    status: 429,
  },
});

/**
 * AI Rate Limiter: Strictly protects Gemini free tier (15 req/min) & Groq (30 req/min).
 * Limits incoming AI symptom analysis to 10 requests per minute per IP.
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 AI calls per minute (well below 15 RPM free tier ceiling)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI triage processing is busy. Your symptoms are saved; please proceed to confirm.',
    status: 429,
  },
});

/**
 * Google Calendar Sync Limiter: Protects calendar OAuth & sync requests.
 */
const calendarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Max 60 calendar operations per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Calendar sync rate limit reached. Please wait a moment.',
    status: 429,
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  aiLimiter,
  calendarLimiter,
};
