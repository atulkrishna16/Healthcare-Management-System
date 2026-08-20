const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const { enqueueNotification, enqueueNotificationById } = require('../jobs/notificationQueue');
const logger = require('../utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// ─── DOCTORS CRUD ─────────────────────────────────────────────────────────────

// GET /admin/doctors
router.get('/doctors', async (req, res) => {
  const doctors = await prisma.doctorProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      workingHours: { orderBy: { dayOfWeek: 'asc' } },
      _count: { select: { appointments: true, leaves: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  res.json(doctors);
});

// POST /admin/doctors
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
  async (req, res) => {
    const { email, name, specialisation, slotDuration, timezone, bio, workingHours } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash('Doctor@1234', 12);

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

    logger.info(`Admin created doctor: ${email}`);
    res.status(201).json(result);
  }
);

// PATCH /admin/doctors/:id
router.patch(
  '/doctors/:id',
  [
    body('specialisation').optional().trim().notEmpty(),
    body('slotDuration').optional().isInt({ min: 5, max: 120 }),
    body('timezone').optional().notEmpty(),
  ],
  validate,
  async (req, res) => {
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
  }
);

// DELETE /admin/doctors/:id
router.delete('/doctors/:id', async (req, res) => {
  const { id } = req.params;

  const profile = await prisma.doctorProfile.findUnique({ where: { id } });
  if (!profile) return res.status(404).json({ error: 'Doctor not found' });

  // Cascade handled by Prisma/DB relations
  await prisma.user.delete({ where: { id: profile.userId } });

  res.json({ message: 'Doctor deleted' });
});

// ─── DOCTOR LEAVE ─────────────────────────────────────────────────────────────

// POST /admin/doctors/:id/leave
router.post(
  '/doctors/:id/leave',
  [
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('reason').optional().trim(),
  ],
  validate,
  async (req, res) => {
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

    // ── Single transaction: insert leave + bulk-update confirmed appointments ──
    let affectedAppointments = [];

    await prisma.$transaction(async (tx) => {
      // Insert leave (upsert to handle duplicate)
      await tx.doctorLeave.upsert({
        where: { doctorId_date: { doctorId: id, date: leaveDate } },
        create: { doctorId: id, date: leaveDate, reason },
        update: { reason },
      });

      // Find all confirmed appointments on that date
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
          where: {
            id: { in: confirmed.map((a) => a.id) },
          },
          data: { status: 'doctor_leave_cancelled' },
        });
      }
    });

    // ── Outside transaction: enqueue leave_notice per affected patient ────────
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
  }
);

// GET /admin/doctors/:id/leave
router.get('/doctors/:id/leave', async (req, res) => {
  const { id } = req.params;
  const leaves = await prisma.doctorLeave.findMany({
    where: { doctorId: id },
    orderBy: { date: 'desc' },
  });
  res.json(leaves);
});

// DELETE /admin/doctors/:doctorId/leave/:leaveId
router.delete('/doctors/:doctorId/leave/:leaveId', async (req, res) => {
  const { leaveId } = req.params;
  await prisma.doctorLeave.delete({ where: { id: leaveId } });
  res.json({ message: 'Leave cancelled' });
});

// ─── FAILED NOTIFICATIONS DASHBOARD ──────────────────────────────────────────

// GET /admin/notifications?status=failed
router.get('/notifications', async (req, res) => {
  const { status = 'failed', page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { status },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: Number(limit),
      include: { appointment: { include: { patient: { select: { name: true, email: true } } } } },
    }),
    prisma.notification.count({ where: { status } }),
  ]);

  res.json({ notifications, total, page: Number(page), limit: Number(limit) });
});

// POST /admin/notifications/:id/retry — manually retry a failed notification
router.post('/notifications/:id/retry', async (req, res) => {
  const { id } = req.params;

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  await prisma.notification.update({
    where: { id },
    data: { status: 'pending', attempts: 0, lastError: null },
  });

  await enqueueNotificationById(id);

  res.json({ message: 'Notification re-queued' });
});

// ─── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
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
});

module.exports = router;
