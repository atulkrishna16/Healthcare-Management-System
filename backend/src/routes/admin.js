const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All admin routes require admin authentication & authorization
router.use(authenticate, authorize('admin'));

/**
 * Doctors CRUD
 */
router.get('/doctors', adminController.listDoctors);

router.post(
  '/doctors',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('specialisation').trim().notEmpty().isLength({ max: 100 }),
    body('slotDuration').isInt({ min: 5, max: 120 }),
    body('timezone').notEmpty().isString().trim(),
    body('bio').optional().trim().isLength({ max: 1000 }),
    body('workingHours').isArray({ max: 7 }).withMessage('workingHours must be an array of ≤7 entries'),
    body('workingHours.*.dayOfWeek').isInt({ min: 0, max: 6 }),
    body('workingHours.*.startTime').matches(/^\d{2}:\d{2}$/).withMessage('startTime must be HH:MM'),
    body('workingHours.*.endTime').matches(/^\d{2}:\d{2}$/).withMessage('endTime must be HH:MM'),
  ],
  validate,
  adminController.createDoctor
);

router.patch(
  '/doctors/:id',
  [
    param('id').notEmpty().isString(),
    body('specialisation').optional().trim().notEmpty().isLength({ max: 100 }),
    body('slotDuration').optional().isInt({ min: 5, max: 120 }),
    body('timezone').optional().notEmpty().isString().trim(),
    body('bio').optional().trim().isLength({ max: 1000 }),
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  ],
  validate,
  adminController.updateDoctor
);

router.delete(
  '/doctors/:id',
  [param('id').notEmpty().isString()],
  validate,
  adminController.deleteDoctor
);

/**
 * Doctor Leave & Schedule Management
 */
router.get(
  '/doctors/:id/schedule',
  [param('id').notEmpty().isString()],
  validate,
  adminController.getDoctorSchedule
);

router.put(
  '/doctors/:id/schedule',
  [
    param('id').notEmpty().isString(),
    body('slotDuration').optional().isInt({ min: 5, max: 120 }),
    body('workingHours').optional().isArray({ max: 7 }),
    body('workingHours.*.dayOfWeek').optional().isInt({ min: 0, max: 6 }),
    body('workingHours.*.startTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('startTime must be HH:MM'),
    body('workingHours.*.endTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('endTime must be HH:MM'),
  ],
  validate,
  adminController.updateDoctorSchedule
);

router.post(
  '/doctors/:id/leave',
  [
    param('id').notEmpty().isString(),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('reason').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  adminController.addDoctorLeave
);

router.get(
  '/doctors/:id/leave',
  [param('id').notEmpty().isString()],
  validate,
  adminController.getDoctorLeaves
);

router.delete(
  '/doctors/:doctorId/leave/:leaveId',
  [
    param('doctorId').notEmpty().isString(),
    param('leaveId').notEmpty().isString(),
  ],
  validate,
  adminController.deleteDoctorLeave
);

/**
 * Notification Dashboard & Retry
 * Whitelist allowed status values to prevent Prisma injection
 */
const VALID_NOTIFICATION_STATUSES = ['pending', 'sent', 'failed', 'retrying'];

router.get(
  '/notifications',
  [
    query('status').optional().isIn(VALID_NOTIFICATION_STATUSES).withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  adminController.listNotifications
);

router.post(
  '/notifications/:id/retry',
  [param('id').notEmpty().isString()],
  validate,
  adminController.retryNotification
);

/**
 * Admin User Management (Create more admins)
 */
router.get('/admins', adminController.listAdmins);

router.post(
  '/admins',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('name').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  adminController.createAdmin
);

/**
 * Live System Health & Diagnostics
 */
router.get('/health-check', adminController.checkSystemHealth);

/**
 * Overall Statistics
 */
router.get('/stats', adminController.getStats);

module.exports = router;
