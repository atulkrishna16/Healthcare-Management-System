const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { enqueueNotification, enqueueNotificationById } = require('../jobs/notificationQueue');
const logger = require('../utils/logger');

exports.listDoctors = async (req, res) => {
  const doctors = await prisma.doctorProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      workingHours: { orderBy: { dayOfWeek: 'asc' } },
      _count: { select: { appointments: true, leaves: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  res.json(doctors);
};

exports.createDoctor = async (req, res) => {
  const { email, name, specialisation, slotDuration, timezone, bio, workingHours } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  // Generate a secure random temporary password — emailed to doctor on creation
  const tempPassword = crypto.randomBytes(12).toString('base64url'); // e.g. "aB3xQzR7mP2N"
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, name, role: 'doctor' },
    });

    const profile = await tx.doctorProfile.create({
      data: { userId: user.id, specialisation, slotDuration, timezone, bio },
    });

    if (workingHours && workingHours.length > 0) {
      await tx.doctorWorkingHours.createMany({
        data: workingHours.map((wh) => ({
          doctorId: profile.id,
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
        })),
      });
    }

    return { user, profile };
  });

  logger.info(`Admin created doctor: ${email} (temp password issued)`);
  // Send temp password via email so the doctor can log in
  try {
    const { sendEmail } = require('../services/email/emailService');
    await sendEmail({
      to: email,
      subject: 'Your Healthcare Manager Doctor Account',
      html: `<h2>Welcome, ${name}!</h2><p>Your account has been created.</p><p><strong>Email:</strong> ${email}</p><p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p><p>Please log in and change your password immediately.</p>`,
    });
  } catch (emailErr) {
    logger.warn(`Could not send welcome email to ${email}: ${emailErr.message}`);
  }
  res.status(201).json({ ...result, tempPasswordIssued: true });
};

exports.updateDoctor = async (req, res) => {
  const { id } = req.params;
  const { specialisation, slotDuration, timezone, bio, name, workingHours } = req.body;

  const profile = await prisma.doctorProfile.findUnique({ where: { id }, include: { user: true } });
  if (!profile) return res.status(404).json({ error: 'Doctor not found' });

  const updated = await prisma.$transaction(async (tx) => {
    if (name) {
      await tx.user.update({ where: { id: profile.userId }, data: { name } });
    }

    const updatedProfile = await tx.doctorProfile.update({
      where: { id },
      data: {
        ...(specialisation && { specialisation }),
        ...(slotDuration && { slotDuration }),
        ...(timezone && { timezone }),
        ...(bio !== undefined && { bio }),
      },
    });

    if (workingHours) {
      await tx.doctorWorkingHours.deleteMany({ where: { doctorId: id } });
      if (workingHours.length > 0) {
        await tx.doctorWorkingHours.createMany({
          data: workingHours.map((wh) => ({
            doctorId: id,
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
          })),
        });
      }
    }

    return updatedProfile;
  });

  res.json(updated);
};

exports.deleteDoctor = async (req, res) => {
  const { id } = req.params;

  const profile = await prisma.doctorProfile.findUnique({ where: { id } });
  if (!profile) return res.status(404).json({ error: 'Doctor not found' });

  await prisma.user.delete({ where: { id: profile.userId } });
  res.json({ message: 'Doctor deleted' });
};

exports.addDoctorLeave = async (req, res) => {
  const { id } = req.params;
  const { date, reason } = req.body;

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const leaveDate = new Date(date);
  const leaveDateEnd = new Date(date);
  leaveDateEnd.setDate(leaveDateEnd.getDate() + 1);

  let affectedAppointments = [];

  await prisma.$transaction(async (tx) => {
    await tx.doctorLeave.upsert({
      where: { doctorId_date: { doctorId: id, date: leaveDate } },
      create: { doctorId: id, date: leaveDate, reason },
      update: { reason },
    });

    const confirmed = await tx.appointment.findMany({
      where: {
        doctorId: id,
        slotStart: { gte: leaveDate, lt: leaveDateEnd },
        status: 'confirmed',
      },
      include: { patient: true },
    });

    affectedAppointments = confirmed;

    if (confirmed.length > 0) {
      await tx.appointment.updateMany({
        where: { id: { in: confirmed.map((a) => a.id) } },
        data: { status: 'doctor_leave_cancelled' },
      });
    }
  });

  for (const appt of affectedAppointments) {
    await enqueueNotification({
      type: 'leave_notice',
      channel: 'email',
      payload: {
        appointmentId: appt.id,
        patientEmail: appt.patient.email,
        patientName: appt.patient.name,
        doctorName: doctor.user.name,
        slotStart: appt.slotStart.toISOString(),
        date,
      },
      appointmentId: appt.id,
    });
  }

  logger.info(`Leave added for doctor ${id} on ${date}. Affected: ${affectedAppointments.length} appointments`);

  res.status(201).json({
    message: 'Leave added',
    date,
    affectedAppointments: affectedAppointments.length,
  });
};

exports.getDoctorLeaves = async (req, res) => {
  const { id } = req.params;
  const leaves = await prisma.doctorLeave.findMany({
    where: { doctorId: id },
    orderBy: { date: 'desc' },
  });
  res.json(leaves);
};

exports.deleteDoctorLeave = async (req, res) => {
  const { leaveId } = req.params;
  await prisma.doctorLeave.delete({ where: { id: leaveId } });
  res.json({ message: 'Leave cancelled' });
};

exports.listNotifications = async (req, res) => {
  const MAX_LIMIT = 100;
  const { status = 'failed', page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_LIMIT);
  const skip = (Math.max(Number(page), 1) - 1) * safeLimit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { status },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: safeLimit,
      include: { appointment: { include: { patient: { select: { name: true, email: true } } } } },
    }),
    prisma.notification.count({ where: { status } }),
  ]);

  res.json({ notifications, total, page: Number(page), limit: safeLimit });
};

exports.retryNotification = async (req, res) => {
  const { id } = req.params;

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  await prisma.notification.update({
    where: { id },
    data: { status: 'pending', attempts: 0, lastError: null },
  });

  await enqueueNotificationById(id);
  res.json({ message: 'Notification re-queued' });
};

exports.getStats = async (req, res) => {
  const [totalDoctors, totalPatients, totalAppointments, failedNotifications] = await Promise.all([
    prisma.doctorProfile.count(),
    prisma.user.count({ where: { role: 'patient' } }),
    prisma.appointment.count(),
    prisma.notification.count({ where: { status: 'failed' } }),
  ]);

  const appointmentsByStatus = await prisma.appointment.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  res.json({
    totalDoctors,
    totalPatients,
    totalAppointments,
    failedNotifications,
    appointmentsByStatus,
  });
};
