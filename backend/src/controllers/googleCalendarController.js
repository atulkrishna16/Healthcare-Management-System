const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/calendar/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const oauth2Client = CLIENT_ID && CLIENT_SECRET ? new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) : null;

exports.getConnectUrl = (req, res) => {
  if (!oauth2Client) {
    return res.status(503).json({
      error: 'Google OAuth2 is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    });
  }

  const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!stateSecret) {
    return res.status(500).json({ error: 'Server authentication secret is not configured' });
  }

  const state = jwt.sign(
    { userId: req.user.id, role: req.user.role },
    stateSecret,
    { expiresIn: '10m' }
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'],
    state,
  });

  res.json({ url: authUrl });
};

exports.oauthCallback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code || !state) {
    return res.redirect(`${FRONTEND_URL}/?google_error=${encodeURIComponent(error || 'auth_cancelled')}`);
  }

  try {
    const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_ACCESS_SECRET;
    const decoded = jwt.verify(state, stateSecret);
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

    const dest = decoded.role === 'doctor' ? '/doctor' : '/patient';
    res.redirect(`${FRONTEND_URL}${dest}?google_calendar_linked=true`);
  } catch (err) {
    logger.error('Google Calendar OAuth callback failed', err.message);
    res.redirect(`${FRONTEND_URL}/?google_error=failed_to_link_calendar`);
  }
};

exports.getStatus = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isGoogleConnected: true },
  });
  res.json({ isConfigured: !!oauth2Client, isConnected: user?.isGoogleConnected || false });
};

exports.disconnect = async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      isGoogleConnected: false,
    },
  });
  res.json({ message: 'Google Calendar disconnected' });
};
