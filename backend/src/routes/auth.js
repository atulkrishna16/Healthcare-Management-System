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
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
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
 * POST /auth/refresh
 */
router.post('/refresh', authController.refresh);

/**
 * GET /auth/me
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
