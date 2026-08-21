const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * POST /auth/register
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be 8–128 characters'),
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required'),
  ],
  validate,
  authController.register
);

/**
 * POST /auth/login
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  authController.login
);

/**
 * POST /auth/refresh — reads refreshToken from httpOnly cookie or body
 */
router.post('/refresh', authController.refresh);

/**
 * POST /auth/logout — clears the httpOnly refresh token cookie server-side
 */
router.post('/logout', authController.logout);

/**
 * GET /auth/me
 */
router.get('/me', authenticate, authController.me);

/**
 * Unified Google OAuth2 (Login + Register + Calendar Sync)
 */
router.get('/google', authController.getGoogleAuthUrl);
router.get('/google/callback', authController.googleAuthCallback);

module.exports = router;
