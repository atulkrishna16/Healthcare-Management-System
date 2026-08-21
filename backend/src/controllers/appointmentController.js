const prisma = require('../utils/prismaClient');
const { enqueueNotification } = require('../jobs/notificationQueue');
const { callLLM } = require('../services/llm/llmService');
const { preVisitSchema, postVisitSchema } = require('../services/llm/schemas');
const { parseFrequencyToOccurrences } = require('../services/medication');
const logger = require('../utils/logger');

// ─── Pre-Visit AI Analysis Helper ─────────────────────────────────────────────
async function runPreVisitLLM(appointmentId, symptoms) {
  const prompt = `Analyse these symptoms and return a JSON with these exact keys:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "string",
  "suggestedQuestions": ["string", "string", "string"]
}
Symptoms: ${symptoms}`;

  const result = await callLLM(prompt, preVisitSchema);

  const fallbackSummary = {
    urgency: 'Medium',
    chiefComplaint: symptoms.length > 100 ? `${symptoms.slice(0, 100)}...` : symptoms,
    suggestedQuestions: [
      'How long have these symptoms persisted?',
      'Are the symptoms getting progressively worse or intermittent?',
      'Are you experiencing any other related symptoms?',
    ],
  };

  await prisma.symptomForm.update({
    where: { appointmentId },
    data: {
      aiSummary: result.status === 'ok' ? result.data : fallbackSummary,
      aiStatus: result.status === 'ok' ? 'ok' : 'failed',
    },
  });

  logger.info(`Pre-visit LLM for appointment ${appointmentId}: ${result.status}`);
}

// ─── Post-Visit AI Summary Helper ─────────────────────────────────────────────
async function runPostVisitLLM(appointmentId, notes, prescription = []) {
  const prompt = `Summarise these clinical notes for the patient in plain, easy-to-understand English.
Return JSON:
{
  "summary": "plain English explanation",
  "keyInstructions": ["instruction 1", "instruction 2"],
  "redFlagWarnings": ["warning 1", "warning 2"]
}
Notes: ${notes}
Prescriptions: ${JSON.stringify(prescription)}`;

  const result = await callLLM(prompt, postVisitSchema);
  if (result.status === 'ok') {
    await prisma.visitNote.update({
      where: { appointmentId },
      data: { aiPatientSummary: result.data },
    });
  }
}

// ─── Controller Handlers ──────────────────────────────────────────────────────

exports.holdSlot = async (req, res) => {
  const { doctorId, slotStart } = req.body;
  const patientId = req.user.id;

  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const slotStartDate = new Date(slotStart);
  const slotEndDate = new Date(slotStartDate.getTime() + doctor.slotDuration * 60 * 1000);
  const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute hold

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId,
          slotStart: slotStartDate,
          status: { in: ['held', 'confirmed'] },
        },
      });

      if (existing) {
        if (existing.status === 'held' && existing.holdExpiresAt && existing.holdExpiresAt < new Date()) {
          await tx.appointment.delete({ where: { id: existing.id } });
        } else {
          const err = new Error('Slot already booked or held');
          err.status = 409;
          throw err;
        }
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
    if (err.code === 'P2002' || (err.code && err.code === '23505') || err.status === 409) {
      return res.status(409).json({ error: 'Slot no longer available' });
    }
    throw err;
  }
};

exports.submitSymptoms = async (req, res) => {
  const { id } = req.params;
  const { symptoms } = req.body;
  const patientId = req.user.id;

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  if (appointment.patientId !== patientId) return res.status(403).json({ error: 'Forbidden' });
  if (appointment.status !== 'held') {
    return res.status(400).json({ error: 'Appointment must be in held state' });
  }

  if (appointment.holdExpiresAt && new Date(appointment.holdExpiresAt) < new Date()) {
    return res.status(410).json({ error: 'Hold has expired. Please start again.' });
  }

  const form = await prisma.symptomForm.upsert({
    where: { appointmentId: id },
    create: { appointmentId: id, symptoms, aiStatus: 'pending' },
    update: { symptoms, aiStatus: 'pending', aiSummary: null },
  });

  runPreVisitLLM(id, symptoms).catch((e) => logger.error('Pre-visit LLM error', e));

  const updatedAppt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: { include: { user: { select: { name: true } } } },
      symptomForm: true,
    },
  });

  res.json({
    appointment: updatedAppt,
    message: 'Symptoms submitted. Proceeding to confirm.',
    symptomFormId: form.id,
  });
};

exports.confirmAppointment = async (req, res) => {
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

  const confirmed = await prisma.appointment.update({
    where: { id },
    data: { status: 'confirmed', holdExpiresAt: null },
  });

  const payload = {
    appointmentId: id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    patientEmail: appointment.patient.email,
    patientName: appointment.patient.name,
    doctorName: appointment.doctor.user.name,
    doctorEmail: appointment.doctor.user.email,
    slotStart: appointment.slotStart.toISOString(),
    slotEnd: appointment.slotEnd.toISOString(),
  };

  await enqueueNotification({ type: 'booking_confirm', channel: 'email', payload, appointmentId: id });
  await enqueueNotification({ type: 'booking_confirm', channel: 'calendar', payload, appointmentId: id });

  res.json({ appointment: confirmed, message: 'Appointment confirmed!' });
};

exports.cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { doctor: { include: { user: true } }, patient: true, calendarEvent: true },
  });

  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

  const isPatient = userRole === 'patient' && appointment.patientId === userId;
  const isDoctor = userRole === 'doctor' && appointment.doctor.userId === userId;
  const isAdmin = userRole === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const cancelled = await prisma.appointment.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  const payload = {
    appointmentId: id,
    patientEmail: appointment.patient.email,
    patientName: appointment.patient.name,
    doctorName: appointment.doctor.user.name,
    slotStart: appointment.slotStart.toISOString(),
    cancelledBy: userRole,
    googleEventId: appointment.calendarEvent?.googleEventId,
  };

  await enqueueNotification({ type: 'cancellation', channel: 'email', payload, appointmentId: id });
  if (appointment.calendarEvent?.googleEventId) {
    await enqueueNotification({ type: 'cancellation', channel: 'calendar', payload, appointmentId: id });
  }

  res.json({ appointment: cancelled, message: 'Appointment cancelled' });
};

exports.rescheduleAppointment = async (req, res) => {
  const { id } = req.params;
  const { slotStart } = req.body;
  const patientId = req.user.id;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { doctor: { include: { user: true } }, patient: true, calendarEvent: true },
  });

  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  if (appointment.patientId !== patientId) return res.status(403).json({ error: 'Forbidden' });

  const slotStartDate = new Date(slotStart);
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: appointment.doctorId } });
  const slotEndDate = new Date(slotStartDate.getTime() + doctor.slotDuration * 60 * 1000);

  const updated = await prisma.appointment.update({
    where: { id },
    data: { slotStart: slotStartDate, slotEnd: slotEndDate, status: 'confirmed' },
  });

  const payload = {
    appointmentId: id,
    patientEmail: appointment.patient.email,
    patientName: appointment.patient.name,
    doctorName: appointment.doctor.user.name,
    slotStart: slotStartDate.toISOString(),
    slotEnd: slotEndDate.toISOString(),
    googleEventId: appointment.calendarEvent?.googleEventId,
  };

  await enqueueNotification({ type: 'booking_confirm', channel: 'email', payload, appointmentId: id });
  if (appointment.calendarEvent?.googleEventId) {
    await enqueueNotification({ type: 'booking_confirm', channel: 'calendar', payload, appointmentId: id });
  }

  res.json({ appointment: updated, message: 'Appointment rescheduled' });
};

exports.listAppointments = async (req, res) => {
  const { role, id } = req.user;
  const { status } = req.query;

  const where = {};
  if (role === 'patient') where.patientId = id;
  if (role === 'doctor') {
    const doc = await prisma.doctorProfile.findUnique({ where: { userId: id } });
    if (!doc) return res.json([]);
    where.doctorId = doc.id;
  }
  if (status) where.status = status;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      patient: { select: { id: true, name: true, email: true } },
      symptomForm: true,
      visitNote: true,
    },
    orderBy: { slotStart: 'desc' },
  });

  res.json(appointments);
};

exports.getAppointmentById = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

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

  if (role === 'patient' && appointment.patientId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (role === 'doctor' && appointment.doctor.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(appointment);
};

exports.submitVisitNotes = async (req, res) => {
  const { id } = req.params;
  const { notes, prescription = [] } = req.body;
  const doctorUserId = req.user.id;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { doctor: true, patient: true },
  });

  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  if (appointment.doctor.userId !== doctorUserId) return res.status(403).json({ error: 'Forbidden' });

  const visitNote = await prisma.visitNote.upsert({
    where: { appointmentId: id },
    create: { appointmentId: id, notes, prescription },
    update: { notes, prescription },
  });

  await prisma.appointment.update({
    where: { id },
    data: { status: 'completed' },
  });

  // Trigger post-visit AI summary in background
  runPostVisitLLM(id, notes, prescription).catch((e) => logger.error('Post-visit LLM error', e));

  // Schedule medication reminders
  for (const med of prescription) {
    const times = parseFrequencyToOccurrences(med.frequency, med.durationDays);
    for (const time of times) {
      await enqueueNotification({
        type: 'med_reminder',
        channel: 'email',
        payload: {
          patientName: appointment.patient.name,
          patientEmail: appointment.patient.email,
          medication: med.medication,
          dosage: med.dosage,
          instructions: med.instructions,
        },
        appointmentId: id,
        scheduledFor: time,
      });
    }
  }

  res.json({ visitNote, message: 'Visit notes submitted. Appointment completed.' });
};
