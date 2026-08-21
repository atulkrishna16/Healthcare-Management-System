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
  // Global API: 200 requests/15min per IP (tighter than before, avoids enumeration attacks)
  apiLimiter: createLimiter(
    15 * 60 * 1000,
    200,
    'Too many requests. Please try again shortly.',
    (req) => req.path === '/health'
  ),

  // Auth: 20 attempts/15min per IP — prevents brute-force on login/register
  authLimiter: createLimiter(
    15 * 60 * 1000,
    20,
    'Too many authentication attempts. Please wait a few moments.'
  ),

  // AI triage: 10/min — expensive LLM endpoint
  aiLimiter: createLimiter(
    60 * 1000,
    10,
    'AI triage is busy. Symptoms saved; proceed to confirm.'
  ),

  // Calendar sync: 30/15min — Google API quota protection
  calendarLimiter: createLimiter(
    15 * 60 * 1000,
    30,
    'Calendar sync rate limit reached. Please wait a moment.'
  ),

  // Slot hold: 10/15min per IP — prevents slot squatting / DoS on slots
  holdLimiter: createLimiter(
    15 * 60 * 1000,
    10,
    'You are holding too many slots. Please complete or wait before holding another.'
  ),
};
