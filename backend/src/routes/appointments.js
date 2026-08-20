const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../utils/prismaClient');
const { enqueueNotification } = require('../jobs/notificationQueue');
const { callLLM } = require('../services/llm/llmService');
const { preVisitSchema, postVisitSchema } = require('../services/llm/schemas');
const { parseFrequencyToOccurrences } = require('../services/medication');
const logger = require('../utils/logger');
const validate = require('../middleware/validate');

// ─── HOLD ─────────────────────────────────────────────────────────────────────
/**
 * POST /appointments/hold
 * Concurrency-safe: DB UNIQUE constraint on (doctorId, slotStart) catches races
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
  async (req, res) => {
    const { doctorId, slotStart } = req.body;
    const patientId = req.user.id;

    const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const slotStartDate = new Date(slotStart);
    const slotEndDate = new Date(slotStartDate.getTime() + doctor.slotDuration * 60 * 1000);
    const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    try {
      // ── Transaction: insert hold row ──────────────────────────────────────
      const appointment = await prisma.$transaction(async (tx) => {
        // Verify slot is still open within the transaction
        const existing = await tx.appointment.findFirst({
          where: {
            doctorId,
            slotStart: slotStartDate,
            status: { in: ['held', 'confirmed'] },
          },
        });
        if (existing) {
          const err = new Error('Slot no longer available');
          err.status = 409;
          throw err;
        }

        return tx.appointment.create({
          data: {
            doctorId,
            patientId,
            slotStart: slotStartDate,
            slotEnd: slotEndDate,
            status: 'held',
            holdExpiresAt,
          },
        });
      });

      res.status(201).json({
        appointment,
        expiresAt: holdExpiresAt,
        message: 'Slot held for 5 minutes. Submit symptoms to proceed.',
      });
    } catch (err) {
      // DB-level unique violation (23505) — two concurrent requests for same slot
      if (err.code === 'P2002' || (err.code && err.code === '23505')) {
        return res.status(409).json({ error: 'Slot no longer available' });
      }
      if (err.status === 409) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  }
);

// ─── SYMPTOMS ─────────────────────────────────────────────────────────────────
/**
 * POST /appointments/:id/symptoms
 * Patient submits symptoms → triggers async pre-visit LLM
 */
router.post(
  '/:id/symptoms',
  authenticate,
  authorize('patient'),
  [body('symptoms').trim().isLength({ min: 10 }).withMessage('Please describe your symptoms (min 10 chars)')],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { symptoms } = req.body;
    const patientId = req.user.id;

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.patientId !== patientId) return res.status(403).json({ error: 'Forbidden' });
    if (appointment.status !== 'held') {
      return res.status(400).json({ error: 'Appointment must be in held state' });
    }

    // Check hold hasn't expired
    if (appointment.holdExpiresAt && new Date(appointment.holdExpiresAt) < new Date()) {
      return res.status(410).json({ error: 'Hold has expired. Please start again.' });
    }

    // Create/update symptom form
    const form = await prisma.symptomForm.upsert({
      where: { appointmentId: id },
      create: { appointmentId: id, symptoms, aiStatus: 'pending' },
      update: { symptoms, aiStatus: 'pending', aiSummary: null },
    });

    // ── Trigger pre-visit LLM asynchronously ──────────────────────────────
    runPreVisitLLM(id, symptoms).catch((e) => logger.error('Pre-visit LLM error', e));

    res.json({ message: 'Symptoms submitted. Proceeding to confirm.', symptomFormId: form.id });
  }
);

async function runPreVisitLLM(appointmentId, symptoms) {
  const prompt = `Analyse these symptoms and return a JSON with these exact keys:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "string",
  "suggestedQuestions": ["string", "string", "string"]
}
Symptoms: ${symptoms}`;

  const result = await callLLM(prompt, preVisitSchema);

  await prisma.symptomForm.update({
    where: { appointmentId },
    data: {
      aiSummary: result.status === 'ok' ? result.data : null,
      aiStatus: result.status === 'ok' ? 'ok' : 'failed',
    },
  });

  logger.info(`Pre-visit LLM for appointment ${appointmentId}: ${result.status}`);
}

// ─── CONFIRM ──────────────────────────────────────────────────────────────────
/**
 * POST /appointments/:id/confirm
 * Flips status → confirmed, enqueues email + calendar notifications
 */
router.post('/:id/confirm', authenticate, authorize('patient'), async (req, res) => {
  const { id } = req.params;
  const patientId = req.user.id;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { doctor: { include: { user: true } }, patient: true },
  });

  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  if (appointment.patientId !== patientId) return res.status(403).json({ error: 'Forbidden' });
  if (appointment.status !== 'held') {
    return res.status(400).json({ error: 'Appointment is not in held state' });
  }
  if (appointment.holdExpiresAt && new Date(appointment.holdExpiresAt) < new Date()) {
    return res.status(410).json({ error: 'Hold has expired. Please start again.' });
  }

  // Update status
  const confirmed = await prisma.appointment.update({
    where: { id },
    data: { status: 'confirmed', holdExpiresAt: null },
  });

  // ── Enqueue notifications (non-blocking) ──────────────────────────────────
  const payload = {
    appointmentId: id,
    patientEmail: appointment.patient.email,
    patientName: appointment.patient.name,
    doctorName: appointment.doctor.user.name,
    doctorEmail: appointment.doctor.user.email,
    slotStart: appointment.slotStart.toISOString(),
    slotEnd: appointment.slotEnd.toISOString(),
  };

  await enqueueNotification({ type: 'booking_confirm', channel: 'email', payload, appointmentId: id });
  await enqueueNotification({ type: 'booking_confirm', channel: 'calendar', payload, appointmentId: id });

  // Schedule 24h reminder
  const reminderTime = new Date(appointment.slotStart.getTime() - 24 * 60 * 60 * 1000);
  if (reminderTime > new Date()) {
    await enqueueNotification({
      type: 'reminder',
      channel: 'email',
      payload,
      appointmentId: id,
      scheduledFor: reminderTime,
    });
  }

  res.json({ appointment: confirmed, message: 'Appointment confirmed!' });
});

// ─── CANCEL ───────────────────────────────────────────────────────────────────
router.post('/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { doctor: { include: { user: true } }, patient: true, calendarEvent: true },
  });

  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

  // Patient can cancel their own; doctor/admin can cancel any
  const isOwner = appointment.patientId === req.user.id;
  const isPrivileged = ['doctor', 'admin'].includes(req.user.role);
  if (!isOwner && !isPrivileged) return res.status(403).json({ error: 'Forbidden' });

  if (!['held', 'confirmed'].includes(appointment.status)) {
    return res.status(400).json({ error: 'Cannot cancel this appointment' });
  }

  await prisma.appointment.update({ where: { id }, data: { status: 'cancelled' } });

  const payload = {
    appointmentId: id,
    patientEmail: appointment.patient.email,
    patientName: appointment.patient.name,
    doctorName: appointment.doctor.user.name,
    slotStart: appointment.slotStart.toISOString(),
  };

  await enqueueNotification({ type: 'cancellation', channel: 'email', payload, appointmentId: id });

  if (appointment.calendarEvent?.googleEventId) {
    await enqueueNotification({
      type: 'cancellation',
      channel: 'calendar',
      payload: { ...payload, googleEventId: appointment.calendarEvent.googleEventId },
      appointmentId: id,
    });
  }

  res.json({ message: 'Appointment cancelled' });
});

// ─── RESCHEDULE ───────────────────────────────────────────────────────────────
router.post(
  '/:id/reschedule',
  authenticate,
  authorize('patient'),
  [body('slotStart').isISO8601()],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { slotStart } = req.body;
    const patientId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true, calendarEvent: true },
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.patientId !== patientId) return res.status(403).json({ error: 'Forbidden' });
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ error: 'Only confirmed appointments can be rescheduled' });
    }

    const newStart = new Date(slotStart);
    const newEnd = new Date(newStart.getTime() + appointment.doctor.slotDuration * 60 * 1000);

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            doctorId: appointment.doctorId,
            slotStart: newStart,
            status: { in: ['held', 'confirmed'] },
            id: { not: id },
          },
        });
        if (conflict) {
          const err = new Error('New slot not available');
          err.status = 409;
          throw err;
        }
        return tx.appointment.update({
          where: { id },
          data: { slotStart: newStart, slotEnd: newEnd },
        });
      });

      const payload = {
        appointmentId: id,
        patientEmail: appointment.patient.email,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.id,
        slotStart: newStart.toISOString(),
        slotEnd: newEnd.toISOString(),
        googleEventId: appointment.calendarEvent?.googleEventId,
      };

      await enqueueNotification({ type: 'booking_confirm', channel: 'email', payload, appointmentId: id });
      if (appointment.calendarEvent?.googleEventId) {
        await enqueueNotification({ type: 'booking_confirm', channel: 'calendar', payload, appointmentId: id });
      }

      res.json({ appointment: updated });
    } catch (err) {
      if (err.status === 409 || err.code === 'P2002') {
        return res.status(409).json({ error: 'New slot not available' });
      }
      throw err;
    }
  }
);

// ─── POST-VISIT NOTES (Doctor) ────────────────────────────────────────────────
/**
 * POST /appointments/:id/notes
 */
router.post(
  '/:id/notes',
  authenticate,
  authorize('doctor'),
  [
    body('notes').trim().notEmpty(),
    body('prescription').isArray().withMessage('prescription must be an array'),
  ],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { notes, prescription } = req.body;
    const doctorUserId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.doctor.userId !== doctorUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const visitNote = await prisma.visitNote.upsert({
      where: { appointmentId: id },
      create: {
        appointmentId: id,
        notes,
        prescription,
        aiStatus: 'pending',
      },
      update: { notes, prescription, aiStatus: 'pending', patientSummary: null },
    });

    // Mark appointment completed
    await prisma.appointment.update({ where: { id }, data: { status: 'completed' } });

    // ── Async: post-visit LLM + medication reminders ──────────────────────
    runPostVisitLLM(id, notes, prescription, appointment.patient.email, appointment.patient.name)
      .catch((e) => logger.error('Post-visit LLM error', e));

    res.json({ visitNote, message: 'Notes saved. Post-visit summary generating.' });
  }
);

async function runPostVisitLLM(appointmentId, notes, prescription, patientEmail, patientName) {
  const prescriptionText = prescription
    .map((p) => `${p.drug} ${p.dosage} ${p.frequency} for ${p.durationDays} days`)
    .join(', ');

  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps.
Return JSON with keys: { "summary": "string", "medicationSchedule": ["string"], "followUpSteps": ["string"] }
Notes: ${notes}
Prescription: ${prescriptionText}`;

  const result = await callLLM(prompt, postVisitSchema);

  await prisma.visitNote.update({
    where: { appointmentId },
    data: {
      patientSummary: result.status === 'ok' ? JSON.stringify(result.data) : null,
      aiStatus: result.status === 'ok' ? 'ok' : 'failed',
    },
  });

  if (result.status === 'ok') {
    // Parse frequencies and enqueue medication reminders
    for (const rx of prescription) {
      const occurrences = parseFrequencyToOccurrences(rx.frequency, rx.durationDays);
      for (const time of occurrences) {
        await enqueueNotification({
          type: 'med_reminder',
          channel: 'email',
          payload: {
            appointmentId,
            patientEmail,
            patientName,
            drug: rx.drug,
            dosage: rx.dosage,
            frequency: rx.frequency,
            time: time.toISOString(),
          },
          appointmentId,
          scheduledFor: time,
        });
      }
    }
  }
}

// ─── VIEW APPOINTMENT ─────────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      patient: { select: { id: true, name: true, email: true } },
      symptomForm: true,
      visitNote: true,
      calendarEvent: true,
    },
  });

  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

  // Patients see their own; doctors see their patients'; admin sees all
  const isPatient = req.user.role === 'patient' && appointment.patientId === req.user.id;
  const isDoctor = req.user.role === 'doctor' && appointment.doctor.userId === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(appointment);
});

// ─── DOCTOR: List upcoming appointments ───────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const { role, id: userId } = req.user;

  let where = {};

  if (role === 'patient') {
    where.patientId = userId;
  } else if (role === 'doctor') {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Doctor profile not found' });
    where.doctorId = profile.id;
  }
  // admin sees all

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: { include: { user: { select: { name: true } } } },
      patient: { select: { id: true, name: true, email: true } },
      symptomForm: true,
      visitNote: true,
    },
    orderBy: { slotStart: 'asc' },
  });

  res.json(appointments);
});

module.exports = router;
