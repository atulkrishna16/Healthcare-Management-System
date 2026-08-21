const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../utils/prismaClient');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * GET /doctors?specialisation=Cardiology
 * Public: search doctors by specialisation
 */
router.get('/', async (req, res) => {
  const { specialisation } = req.query;

  const where = {};
  if (specialisation) {
    where.specialisation = { contains: specialisation, mode: 'insensitive' };
  }

  const doctors = await prisma.doctorProfile.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      workingHours: true,
    },
    orderBy: { user: { name: 'asc' } },
  });

  res.json(
    doctors.map((d) => ({
      id: d.id,
      name: d.user.name,
      email: d.user.email,
      specialisation: d.specialisation,
      slotDuration: d.slotDuration,
      timezone: d.timezone,
      bio: d.bio,
      workingHours: d.workingHours,
    }))
  );
});

/**
 * GET /doctors/me/schedule
 * Doctor only: get own schedule & availability
 */
router.get('/me/schedule', authenticate, authorize('doctor'), async (req, res) => {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: req.user.id },
    include: {
      workingHours: { orderBy: { dayOfWeek: 'asc' } },
      leaves: { orderBy: { date: 'asc' } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

  res.json({
    id: doctor.id,
    name: doctor.user.name,
    specialisation: doctor.specialisation,
    slotDuration: doctor.slotDuration,
    timezone: doctor.timezone,
    workingHours: doctor.workingHours,
    leaves: doctor.leaves,
  });
});

/**
 * PUT /doctors/me/schedule
 * Doctor only: update own slot duration and working hours per day
 */
router.put('/me/schedule', authenticate, authorize('doctor'), async (req, res) => {
  const { slotDuration, workingHours } = req.body;

  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: req.user.id },
  });
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

  // Update profile slot duration if provided
  if (slotDuration) {
    await prisma.doctorProfile.update({
      where: { id: doctor.id },
      data: { slotDuration: Number(slotDuration) },
    });
  }

  // Update working hours
  if (Array.isArray(workingHours)) {
    // Delete existing working hours and replace with updated active days
    await prisma.$transaction(async (tx) => {
      await tx.doctorWorkingHours.deleteMany({
        where: { doctorId: doctor.id },
      });

      const records = workingHours
        .filter((wh) => wh.active !== false && wh.startTime && wh.endTime)
        .map((wh) => ({
          doctorId: doctor.id,
          dayOfWeek: Number(wh.dayOfWeek),
          startTime: wh.startTime,
          endTime: wh.endTime,
        }));

      if (records.length > 0) {
        await tx.doctorWorkingHours.createMany({
          data: records,
        });
      }
    });
  }

  const updated = await prisma.doctorProfile.findUnique({
    where: { id: doctor.id },
    include: {
      workingHours: { orderBy: { dayOfWeek: 'asc' } },
      leaves: { orderBy: { date: 'asc' } },
    },
  });

  res.json({
    message: 'Schedule and availability updated successfully',
    doctor: updated,
  });
});

/**
 * POST /doctors/me/leave
 * Doctor only: declare date unavailability / time off
 */
router.post('/me/leave', authenticate, authorize('doctor'), async (req, res) => {
  const { date, reason } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: req.user.id },
  });
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

  const leaveDate = dayjs(date).startOf('day').toDate();

  const leave = await prisma.doctorLeave.upsert({
    where: { doctorId_date: { doctorId: doctor.id, date: leaveDate } },
    update: { reason },
    create: { doctorId: doctor.id, date: leaveDate, reason },
  });

  res.status(201).json({ message: 'Leave recorded', leave });
});

/**
 * DELETE /doctors/me/leave/:id
 * Doctor only: cancel a declared leave
 */
router.delete('/me/leave/:id', authenticate, authorize('doctor'), async (req, res) => {
  const { id } = req.params;
  const doctor = await prisma.doctorProfile.findUnique({
    where: { userId: req.user.id },
  });
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

  await prisma.doctorLeave.deleteMany({
    where: { id, doctorId: doctor.id },
  });

  res.json({ message: 'Leave cancelled' });
});

/**
 * GET /doctors/:id
 * Public: get single doctor profile details
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      workingHours: true,
    },
  });

  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  res.json({
    id: doctor.id,
    name: doctor.user.name,
    email: doctor.user.email,
    specialisation: doctor.specialisation,
    slotDuration: doctor.slotDuration,
    timezone: doctor.timezone,
    bio: doctor.bio,
    workingHours: doctor.workingHours,
  });
});

/**
 * GET /doctors/:id/slots?date=2024-01-15
 * Public: available slots on a given date
 */
router.get('/:id/slots', async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
  }

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id },
    include: { workingHours: true },
  });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  // Check for leave on this date
  const targetDate = dayjs.tz(date, doctor.timezone).startOf('day');
  const leaveDate = targetDate.toDate();
  const leaveNextDate = targetDate.add(1, 'day').toDate();

  const leave = await prisma.doctorLeave.findFirst({
    where: {
      doctorId: id,
      date: {
        gte: leaveDate,
        lt: leaveNextDate,
      },
    },
  });

  if (leave) {
    return res.json({ slots: [], reason: 'Doctor on leave' });
  }

  // Get day of week (0=Sun in dayjs)
  const dayOfWeek = targetDate.day();
  const workHours = doctor.workingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!workHours) {
    return res.json({ slots: [], reason: 'Doctor not working on this day' });
  }

  // Build all slots from working hours
  const [startH, startM] = workHours.startTime.split(':').map(Number);
  const [endH, endM] = workHours.endTime.split(':').map(Number);
  const slotDuration = doctor.slotDuration;

  let current = targetDate.hour(startH).minute(startM).second(0).millisecond(0);
  const endTime = targetDate.hour(endH).minute(endM).second(0).millisecond(0);
  const allSlots = [];

  while (current.isBefore(endTime)) {
    allSlots.push(current.toDate());
    current = current.add(slotDuration, 'minute');
  }

  // Get booked/held slots
  const startOfDay = targetDate.toDate();
  const endOfDay = targetDate.endOf('day').toDate();

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId: id,
      slotStart: { gte: startOfDay, lte: endOfDay },
      status: { in: ['held', 'confirmed'] },
    },
    select: { slotStart: true },
  });

  const bookedTimes = new Set(booked.map((b) => b.slotStart.toISOString()));

  const availableSlots = allSlots
    .filter((s) => !bookedTimes.has(s.toISOString()))
    .filter((s) => new Date(s) > new Date()) // only future slots
    .map((s) => ({
      slotStart: s.toISOString(),
      slotEnd: new Date(s.getTime() + slotDuration * 60 * 1000).toISOString(),
    }));

  res.json({ slots: availableSlots, date, doctorId: id });
});

module.exports = router;
