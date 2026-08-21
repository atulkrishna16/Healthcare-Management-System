const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
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
    body('name').trim().notEmpty(),
    body('specialisation').trim().notEmpty(),
    body('slotDuration').isInt({ min: 5, max: 120 }),
    body('timezone').notEmpty(),
    body('workingHours').isArray(),
  ],
  validate,
  adminController.createDoctor
);

router.patch(
  '/doctors/:id',
  [
    body('specialisation').optional().trim().notEmpty(),
    body('slotDuration').optional().isInt({ min: 5, max: 120 }),
    body('timezone').optional().notEmpty(),
  ],
  validate,
  adminController.updateDoctor
);

router.delete('/doctors/:id', adminController.deleteDoctor);

/**
 * Doctor Leave Management
 */
router.post(
  '/doctors/:id/leave',
  [
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('reason').optional().trim(),
  ],
  validate,
  adminController.addDoctorLeave
);

router.get('/doctors/:id/leave', adminController.getDoctorLeaves);
router.delete('/doctors/:doctorId/leave/:leaveId', adminController.deleteDoctorLeave);

/**
 * Notification Dashboard & Retry
 */
router.get('/notifications', adminController.listNotifications);
router.post('/notifications/:id/retry', adminController.retryNotification);

/**
 * Overall Statistics
 */
router.get('/stats', adminController.getStats);

module.exports = router;
