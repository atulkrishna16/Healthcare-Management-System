const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * Public Routes
 * NOTE: /me/schedule MUST be registered before /:id to avoid "me" being captured as an ID.
 * Express matches routes in registration order.
 */
router.get(
  '/me/schedule',
  authenticate,
  authorize('doctor'),
  doctorController.getOwnSchedule
);

router.put(
  '/me/schedule',
  authenticate,
  authorize('doctor'),
  [
    body('slotDuration').optional().isInt({ min: 5, max: 120 }),
    body('workingHours').optional().isArray({ max: 7 }),
    body('workingHours.*.dayOfWeek').optional().isInt({ min: 0, max: 6 }),
    body('workingHours.*.startTime').optional().matches(/^\d{2}:\d{2}$/),
    body('workingHours.*.endTime').optional().matches(/^\d{2}:\d{2}$/),
  ],
  validate,
  doctorController.updateOwnSchedule
);

router.post(
  '/me/leave',
  authenticate,
  authorize('doctor'),
  [
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('reason').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  doctorController.addOwnLeave
);

router.delete(
  '/me/leave/:id',
  authenticate,
  authorize('doctor'),
  [param('id').notEmpty().isString()],
  validate,
  doctorController.deleteOwnLeave
);

/**
 * Public: List doctors (specialisation filter validated)
 */
router.get(
  '/',
  [
    query('specialisation').optional().trim().isLength({ max: 100 }),
  ],
  validate,
  doctorController.listDoctors
);

/**
 * Public: Get doctor by ID
 */
router.get(
  '/:id',
  [param('id').notEmpty().isString()],
  validate,
  doctorController.getDoctorById
);

/**
 * Public: Get doctor slots for a given date
 */
router.get(
  '/:id/slots',
  [
    param('id').notEmpty().isString(),
    query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
  ],
  validate,
  doctorController.getDoctorSlots
);

module.exports = router;
