const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_development_mode_min32chars';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_development_mode_min32chars';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

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

exports.register = async (req, res) => {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'patient',
    },
  });

  const tokens = generateTokens(user);
  logger.info(`New patient registered: ${user.email}`);

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...tokens,
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { doctorProfile: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const tokens = generateTokens(user);
  logger.info(`User logged in: ${user.email} (${user.role})`);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      doctorProfile: user.doctorProfile,
    },
    ...tokens,
  });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
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
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isGoogleConnected: true,
      doctorProfile: true,
    },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};
