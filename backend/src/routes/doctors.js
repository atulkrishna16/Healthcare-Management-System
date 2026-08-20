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
