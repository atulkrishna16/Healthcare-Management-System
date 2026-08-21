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
 * Patient: Submit pre-consultation symptoms
 */
router.post(
  '/:id/symptoms',
  authenticate,
  authorize('patient'),
  aiLimiter,
  [body('symptoms').trim().isLength({ min: 10 }).withMessage('Please describe your symptoms (min 10 chars)')],
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
  [body('notes').trim().notEmpty().withMessage('Clinical notes required')],
  validate,
  appointmentController.submitVisitNotes
);

module.exports = router;
