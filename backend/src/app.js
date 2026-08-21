require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// ── Startup secret guards — crash loudly rather than silently use fallbacks ──
['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`FATAL: ${key} environment variable is not set. Refusing to start.`);
  }
});

// ── Route Imports ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const googleCalendarRoutes = require('./routes/googleCalendar');

const app = express();

// Trust proxy for rate limiting behind reverse proxies (Render, Vercel)
app.set('trust proxy', 1);

// ── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet()); // No overrides — keep all defaults including CORP

// Strict CORS — only explicitly listed origins are allowed
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);

    if (
      allowed.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body size limits — prevent memory-exhaustion DoS
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ── Health Check (Bypasses rate limiting) ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global API Rate Limiter ───────────────────────────────────────────────────
app.use(apiLimiter);

// ── Route Groups ──────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, authRoutes);
app.use('/doctors', doctorRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/admin', adminRoutes);
app.use('/calendar/google', googleCalendarRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
