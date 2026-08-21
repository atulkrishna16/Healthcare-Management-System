/**
 * Application-wide constants.
 * Single source of truth for all magic strings to eliminate typo-prone literals.
 */

// ── Appointment Statuses ──────────────────────────────────────────────────────
const APPOINTMENT_STATUS = Object.freeze({
  HELD: 'held',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  DOCTOR_LEAVE_CANCELLED: 'doctor_leave_cancelled',
});

// ── AI Triage Urgency Levels ──────────────────────────────────────────────────
const URGENCY = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
});

// ── AI Status ─────────────────────────────────────────────────────────────────
const AI_STATUS = Object.freeze({
  OK: 'ok',
  PENDING: 'pending',
  FAILED: 'failed',
});

// ── User Roles ─────────────────────────────────────────────────────────────────
const ROLE = Object.freeze({
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
});

// ── Hold Window ───────────────────────────────────────────────────────────────
const HOLD_EXPIRES_MINUTES = 5;

// ── Notification Channels & Types ─────────────────────────────────────────────
const NOTIFICATION_CHANNEL = Object.freeze({
  EMAIL: 'email',
  CALENDAR: 'calendar',
});

const NOTIFICATION_TYPE = Object.freeze({
  BOOKING_CONFIRM: 'booking_confirm',
  CANCELLATION: 'cancellation',
  LEAVE_NOTICE: 'leave_notice',
  MED_REMINDER: 'med_reminder',
});

module.exports = {
  APPOINTMENT_STATUS,
  URGENCY,
  AI_STATUS,
  ROLE,
  HOLD_EXPIRES_MINUTES,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_TYPE,
};

