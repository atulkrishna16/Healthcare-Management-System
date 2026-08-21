const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

/**
 * Patient: Hold a slot
 */
router.post(
  '/hold',
  authenticate,
  authorize('patient'),
  [
    body('doctorId').notEmpty(),
    body('slotStart').isISO8601().withMessage('slotStart must be ISO8601'),
  ],
  validate,
  appointmentController.holdSlot
);

/**
 * Patient: Submit pre-consultation symptoms (Non-blocking AI triage with automatic raw fallback)
 */
router.post(
  '/:id/symptoms',
  authenticate,
  authorize('patient'),
  [body('symptoms').trim().isLength({ min: 10, max: 2000 }).withMessage('Please describe your symptoms (10–2000 chars)')],
  validate,
  appointmentController.submitSymptoms
);

/**
 * Patient: Confirm appointment
 */
router.post('/:id/confirm', authenticate, authorize('patient'), appointmentController.confirmAppointment);

/**
 * Patient / Doctor / Admin: Cancel appointment
 */
router.post('/:id/cancel', authenticate, appointmentController.cancelAppointment);

/**
 * Patient: Reschedule appointment
 */
router.post(
  '/:id/reschedule',
  authenticate,
  authorize('patient'),
  [body('slotStart').isISO8601().withMessage('slotStart must be ISO8601')],
  validate,
  appointmentController.rescheduleAppointment
);

/**
 * Authenticated: List appointments for current user
 */
router.get('/', authenticate, appointmentController.listAppointments);

/**
 * Authenticated: Get single appointment details
 */
router.get('/:id', authenticate, appointmentController.getAppointmentById);

/**
 * Doctor: Submit post-visit notes & prescription
 */
router.post(
  '/:id/notes',
  authenticate,
  authorize('doctor'),
  [
    body('notes').trim().notEmpty().isLength({ max: 10000 }).withMessage('Clinical notes required'),
    body('prescription').optional().isArray({ max: 20 }).withMessage('Max 20 prescriptions'),
    body('prescription.*.medication').trim().isLength({ max: 200 }),
    body('prescription.*.dosage').optional().trim().isLength({ max: 100 }),
    body('prescription.*.frequency').optional().trim().isLength({ max: 100 }),
  ],
  validate,
  appointmentController.submitVisitNotes
);

module.exports = router;
