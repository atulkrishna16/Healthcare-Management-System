const prisma = require('../utils/prismaClient');
const { enqueueNotification } = require('../jobs/notificationQueue');
const { runPreVisitLLM, runPostVisitLLM } = require('../services/appointmentLLMService');
const { parseFrequencyToOccurrences } = require('../services/medication');
const { APPOINTMENT_STATUS, ROLE, HOLD_EXPIRES_MINUTES, NOTIFICATION_CHANNEL, NOTIFICATION_TYPE } = require('../lib/constants');
const { addMinutes } = require('../lib/dateUtils');
const logger = require('../utils/logger');

// ─── Controller Handlers ──────────────────────────────────────────────────────

exports.holdSlot = async (req, res) => {
  const { doctorId, slotStart } = req.body;
  const patientId = req.user.id;

  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const slotStartDate = new Date(slotStart);
  const slotEndDate = addMinutes(slotStartDate, doctor.slotDuration);
  const holdExpiresAt = addMinutes(new Date(), HOLD_EXPIRES_MINUTES);

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId,
          slotStart: slotStartDate,
          status: { in: [APPOINTMENT_STATUS.HELD, APPOINTMENT_STATUS.CONFIRMED] },
        },
      });

      if (existing) {
        if (existing.status === APPOINTMENT_STATUS.HELD && existing.holdExpiresAt && existing.holdExpiresAt < new Date()) {
          await tx.appointment.delete({ where: { id: existing.id } });
        } else {
          const err = new Error('Slot already booked or held');
          err.status = 409;
          throw err;
        }
      }

      return tx.appointment.create({
        data: { doctorId, patientId, slotStart: slotStartDate, slotEnd: slotEndDate, status: APPOINTMENT_STATUS.HELD, holdExpiresAt },
      });
    });

    res.status(201).json({
      appointment,
      expiresAt: holdExpiresAt,
      message: 'Slot held for 5 minutes. Submit symptoms to proceed.',
    });
  } catch (err) {
    if (err.code === 'P2002' || err.code === '23505' || err.status === 409) {
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
  if (appointment.status !== APPOINTMENT_STATUS.HELD) {
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
    include: { doctor: { include: { user: { select: { name: true } } } }, symptomForm: true },
  });

  res.json({ appointment: updatedAppt, message: 'Symptoms submitted. Proceeding to confirm.', symptomFormId: form.id });
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
  if (appointment.status !== APPOINTMENT_STATUS.HELD) {
    return res.status(400).json({ error: 'Appointment is not in held state' });
  }
  if (appointment.holdExpiresAt && new Date(appointment.holdExpiresAt) < new Date()) {
    return res.status(410).json({ error: 'Hold has expired. Please start again.' });
  }

  const confirmed = await prisma.appointment.update({
    where: { id },
    data: { status: APPOINTMENT_STATUS.CONFIRMED, holdExpiresAt: null },
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

  await enqueueNotification({ type: NOTIFICATION_TYPE.BOOKING_CONFIRM, channel: NOTIFICATION_CHANNEL.EMAIL, payload, appointmentId: id });
  await enqueueNotification({ type: NOTIFICATION_TYPE.BOOKING_CONFIRM, channel: NOTIFICATION_CHANNEL.CALENDAR, payload, appointmentId: id });

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

  const isPatient = userRole === ROLE.PATIENT && appointment.patientId === userId;
  const isDoctor = userRole === ROLE.DOCTOR && appointment.doctor.userId === userId;
  const isAdmin = userRole === ROLE.ADMIN;

  if (!isPatient && !isDoctor && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const cancelled = await prisma.appointment.update({
    where: { id },
    data: { status: APPOINTMENT_STATUS.CANCELLED },
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

  await enqueueNotification({ type: NOTIFICATION_TYPE.CANCELLATION, channel: NOTIFICATION_CHANNEL.EMAIL, payload, appointmentId: id });
  if (appointment.calendarEvent?.googleEventId) {
    await enqueueNotification({ type: NOTIFICATION_TYPE.CANCELLATION, channel: NOTIFICATION_CHANNEL.CALENDAR, payload, appointmentId: id });
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
  const slotEndDate = addMinutes(slotStartDate, doctor.slotDuration);

  const updated = await prisma.appointment.update({
    where: { id },
    data: { slotStart: slotStartDate, slotEnd: slotEndDate, status: APPOINTMENT_STATUS.CONFIRMED },
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

  await enqueueNotification({ type: NOTIFICATION_TYPE.BOOKING_CONFIRM, channel: NOTIFICATION_CHANNEL.EMAIL, payload, appointmentId: id });
  if (appointment.calendarEvent?.googleEventId) {
    await enqueueNotification({ type: NOTIFICATION_TYPE.BOOKING_CONFIRM, channel: NOTIFICATION_CHANNEL.CALENDAR, payload, appointmentId: id });
  }

  res.json({ appointment: updated, message: 'Appointment rescheduled' });
};

exports.listAppointments = async (req, res) => {
  const { role, id } = req.user;
  const { status } = req.query;

  const where = {};
  if (role === ROLE.PATIENT) where.patientId = id;
  if (role === ROLE.DOCTOR) {
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
  if (role === ROLE.PATIENT && appointment.patientId !== userId) return res.status(403).json({ error: 'Forbidden' });
  if (role === ROLE.DOCTOR && appointment.doctor.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

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
    data: { status: APPOINTMENT_STATUS.COMPLETED },
  });

  runPostVisitLLM(id, notes, prescription).catch((e) => logger.error('Post-visit LLM error', e));

  for (const med of prescription) {
    const times = parseFrequencyToOccurrences(med.frequency, med.durationDays);
    for (const time of times) {
      await enqueueNotification({
        type: NOTIFICATION_TYPE.MED_REMINDER,
        channel: NOTIFICATION_CHANNEL.EMAIL,
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
