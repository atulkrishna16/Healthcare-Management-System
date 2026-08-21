const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { google } = require('googleapis');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// Fail hard at require-time if secrets are missing
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('FATAL: JWT secrets must be set');
}

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const oauth2Client = CLIENT_ID && CLIENT_SECRET ? new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) : null;

function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.doctorProfile && { doctorProfileId: user.doctorProfile.id }),
  };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
}

function sendAuthResponse(res, user, tokens) {
  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTS);
  return {
    user,
    accessToken: tokens.accessToken,
  };
}

exports.register = async (req, res) => {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: 'patient' },
  });

  const tokens = generateTokens(user);
  logger.info(`New patient registered: ${user.email}`);

  res.status(201).json(sendAuthResponse(res, {
    id: user.id, email: user.email, name: user.name, role: user.role,
  }, tokens));
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { doctorProfile: true },
  });

  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const tokens = generateTokens(user);
  logger.info(`User logged in: ${user.email} (${user.role})`);

  res.json(sendAuthResponse(res, {
    id: user.id, email: user.email, name: user.name, role: user.role, doctorProfile: user.doctorProfile,
  }, tokens));
};

exports.refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { doctorProfile: true },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });

    const tokens = generateTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTS);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ message: 'Logged out' });
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, isGoogleConnected: true, doctorProfile: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

// ── Unified Google OAuth2 (Login + Registration + Calendar Link in 1 Click) ──

exports.getGoogleAuthUrl = (req, res) => {
  if (!oauth2Client) {
    return res.status(503).json({
      error: 'Google OAuth2 is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });

  res.json({ url: authUrl });
};

exports.googleAuthCallback = async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?google_error=${encodeURIComponent(error || 'auth_cancelled')}`);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile?.email) {
      return res.redirect(`${FRONTEND_URL}/login?google_error=no_email_returned`);
    }

    let user = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { doctorProfile: true },
    });

    if (!user) {
      // New patient registration via Google
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || 'Patient',
          passwordHash,
          role: 'patient',
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || null,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isGoogleConnected: true,
        },
        include: { doctorProfile: true },
      });
      logger.info(`New user registered via Google: ${user.email}`);
    } else {
      // Update Google OAuth tokens for existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: tokens.access_token,
          ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
          ...(tokens.expiry_date && { googleTokenExpiry: new Date(tokens.expiry_date) }),
          isGoogleConnected: true,
        },
        include: { doctorProfile: true },
      });
      logger.info(`Existing user logged in via Google: ${user.email} (${user.role})`);
    }

    const appTokens = generateTokens(user);
    res.cookie('refreshToken', appTokens.refreshToken, COOKIE_OPTS);

    res.redirect(`${FRONTEND_URL}/login?google_token=${appTokens.accessToken}&role=${user.role}`);
  } catch (err) {
    logger.error(`Google Auth Callback Error: ${err.message}`);
    res.redirect(`${FRONTEND_URL}/login?google_error=failed_to_link_google_account`);
  }
};
