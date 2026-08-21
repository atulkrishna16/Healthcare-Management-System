const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { calendarLimiter } = require('../middleware/rateLimiter');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/calendar/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function getOAuthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return null;
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Apply rate limiter to all calendar routes
router.use(calendarLimiter);

/**
 * GET /calendar/google/connect
 * Initiates OAuth2 flow for linking Google Calendar to current user
 */
router.get('/connect', authenticate, (req, res) => {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) {
    return res.status(503).json({
      error: 'Google OAuth2 is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env',
    });
  }

  // Encode user ID in state token
  const state = jwt.sign({ userId: req.user.id, role: req.user.role }, process.env.JWT_ACCESS_SECRET || 'fallback_secret', {
    expiresIn: '10m',
  });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh_token
    prompt: 'consent', // Forces refresh token on re-auth
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });

  res.json({ url: authUrl });
});

/**
 * GET /calendar/google/callback
 * Google redirects here with ?code=...&state=...
 */
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    logger.warn('Google Calendar authorization declined:', error);
    return res.redirect(`${FRONTEND_URL}/?google_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing authorization code or state');
  }

  try {
    const decoded = jwt.verify(state, process.env.JWT_ACCESS_SECRET || 'fallback_secret');
    const oauth2Client = getOAuthClient();
    if (!oauth2Client) throw new Error('OAuth2 client not initialized');

    const { tokens } = await oauth2Client.getToken(code);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isGoogleConnected: true,
      },
    });

    logger.info(`User ${decoded.userId} successfully connected Google Calendar`);
    const destination = decoded.role === 'doctor' ? '/doctor' : '/patient';
    res.redirect(`${FRONTEND_URL}${destination}?google_calendar_linked=true`);
  } catch (err) {
    logger.error('Google Calendar OAuth callback failed', err);
    res.redirect(`${FRONTEND_URL}/?google_error=failed_to_link_calendar`);
  }
});

/**
 * GET /calendar/google/status
 * Check if the currently logged in user has linked Google Calendar
 */
router.get('/status', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isGoogleConnected: true },
  });

  res.json({
    isConfigured: !!(CLIENT_ID && CLIENT_SECRET),
    isConnected: user?.isGoogleConnected || false,
  });
});

/**
 * POST /calendar/google/disconnect
 * Unlink Google Calendar tokens
 */
router.post('/disconnect', authenticate, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      isGoogleConnected: false,
    },
  });

  res.json({ message: 'Google Calendar disconnected successfully' });
});

module.exports = router;
