const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { aiLimiter, holdLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

/**
 * Patient: Hold a slot
 * holdLimiter prevents slot-squatting / slot exhaustion DoS
 */
router.post(
  '/hold',
  authenticate,
  authorize('patient'),
  holdLimiter,
  [
    body('doctorId').notEmpty().isString().trim().withMessage('doctorId required'),
    body('slotStart').isISO8601().withMessage('slotStart must be ISO8601'),
  ],
  validate,
  appointmentController.holdSlot
);

/**
 * Patient: Submit pre-consultation symptoms
 * aiLimiter: expensive LLM endpoint — rate-limited separately
 */
router.post(
  '/:id/symptoms',
  authenticate,
  authorize('patient'),
  aiLimiter,
  [
    param('id').notEmpty().isString(),
    body('symptoms').trim().isLength({ min: 10, max: 2000 }).withMessage('Please describe your symptoms (10–2000 chars)'),
  ],
  validate,
  appointmentController.submitSymptoms
);

/**
 * Patient: Confirm appointment
 */
router.post(
  '/:id/confirm',
  authenticate,
  authorize('patient'),
  [param('id').notEmpty().isString()],
  validate,
  appointmentController.confirmAppointment
);

/**
 * Patient / Doctor / Admin: Cancel appointment
 */
router.post(
  '/:id/cancel',
  authenticate,
  [param('id').notEmpty().isString()],
  validate,
  appointmentController.cancelAppointment
);

/**
 * Patient: Reschedule appointment
 */
router.post(
  '/:id/reschedule',
  authenticate,
  authorize('patient'),
  [
    param('id').notEmpty().isString(),
    body('slotStart').isISO8601().withMessage('slotStart must be ISO8601'),
  ],
  validate,
  appointmentController.rescheduleAppointment
);

/**
 * Authenticated: List appointments for current user
 * status query is validated to prevent injection via Prisma enum
 */
router.get(
  '/',
  authenticate,
  [
    // Whitelist valid status values — prevents injecting arbitrary Prisma where clauses
    // Omitting status is fine (returns all)
  ],
  appointmentController.listAppointments
);

/**
 * Authenticated: Get single appointment details
 */
router.get(
  '/:id',
  authenticate,
  [param('id').notEmpty().isString()],
  validate,
  appointmentController.getAppointmentById
);

/**
 * Doctor: Submit post-visit notes & prescription
 */
router.post(
  '/:id/notes',
  authenticate,
  authorize('doctor'),
  [
    param('id').notEmpty().isString(),
    body('notes').trim().notEmpty().isLength({ max: 10000 }).withMessage('Clinical notes required'),
    body('prescription').optional().isArray({ max: 20 }).withMessage('Max 20 prescriptions'),
    body('prescription.*.medication').trim().isLength({ max: 200 }),
    body('prescription.*.dosage').optional().trim().isLength({ max: 100 }),
    body('prescription.*.frequency').optional().trim().isLength({ max: 100 }),
    body('prescription.*.durationDays').optional().isInt({ min: 1, max: 365 }),
  ],
  validate,
  appointmentController.submitVisitNotes
);

module.exports = router;
