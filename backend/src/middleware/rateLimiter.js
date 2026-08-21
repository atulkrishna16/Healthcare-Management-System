const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, error, skip) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error, status: 429 },
    ...(skip && { skip }),
  });

module.exports = {
  apiLimiter: createLimiter(15 * 60 * 1000, 500, 'Too many requests. Please try again shortly.', (req) => req.path === '/health'),
  authLimiter: createLimiter(15 * 60 * 1000, 100, 'Too many authentication attempts. Please wait a few moments.'),
  aiLimiter: createLimiter(60 * 1000, 10, 'AI triage is busy. Symptoms saved; proceed to confirm.'),
  calendarLimiter: createLimiter(15 * 60 * 1000, 60, 'Calendar sync rate limit reached. Please wait a moment.'),
};
