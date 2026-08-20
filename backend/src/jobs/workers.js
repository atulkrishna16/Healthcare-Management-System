const { Worker } = require('bullmq');
const { redisConnection } = require('./redisConnection');
const prisma = require('../utils/prismaClient');
const { sendEmail } = require('../services/email/emailService');
const { createCalendarEvent, patchCalendarEvent, deleteCalendarEvent } = require('../services/calendar/calendarService');
const logger = require('../utils/logger');

// Exponential backoff delays in ms: 1m, 5m, 30m
const BACKOFF_DELAYS = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  30 * 60 * 1000,
];
const MAX_ATTEMPTS = 5;

async function processNotification(job) {
  const { notificationId } = job.data;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { appointment: { include: { doctor: { include: { user: true } }, patient: true } } },
  });

  if (!notification) {
    logger.warn(`Notification ${notificationId} not found, skipping`);
    return;
  }

  // Skip if already sent
  if (notification.status === 'sent') {
    logger.debug(`Notification ${notificationId} already sent, skipping`);
    return;
  }

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { attempts: { increment: 1 } },
    });

    if (notification.channel === 'email') {
      await handleEmailNotification(notification);
    } else if (notification.channel === 'calendar') {
      await handleCalendarNotification(notification);
    }

    // Mark sent
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'sent', lastError: null },
    });

    logger.info(`✅ Notification ${notificationId} sent (${notification.type}/${notification.channel})`);
  } catch (err) {
    const attempts = notification.attempts + 1; // +1 because we just incremented
    const lastError = err.message || String(err);

    if (attempts >= MAX_ATTEMPTS) {
      // Mark permanently failed
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'failed', lastError },
      });
      logger.error(`❌ Notification ${notificationId} permanently failed after ${attempts} attempts: ${lastError}`);
      return; // Don't rethrow — don't want BullMQ to retry
    }

    // Calculate backoff delay
    const backoffDelay = BACKOFF_DELAYS[Math.min(attempts - 1, BACKOFF_DELAYS.length - 1)];

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'retrying', lastError },
    });

    // Re-enqueue with delay
    const { notificationQueue } = require('./notificationQueue');
    await notificationQueue.add(
      `retry:${notificationId}:${attempts}`,
      { notificationId },
      { delay: backoffDelay }
    );

    logger.warn(
      `⚠️ Notification ${notificationId} failed (attempt ${attempts}), retrying in ${backoffDelay / 60000}min`
    );
  }
}

async function handleEmailNotification(notification) {
  const { type, payload } = notification;
  const p = typeof payload === 'string' ? JSON.parse(payload) : payload;

  switch (type) {
    case 'booking_confirm':
      await sendEmail({
        to: p.patientEmail,
        subject: 'Appointment Confirmed — Healthcare Manager',
        html: `
          <h2>Appointment Confirmed! 🎉</h2>
          <p>Dear <strong>${p.patientName}</strong>,</p>
          <p>Your appointment with <strong>${p.doctorName}</strong> has been confirmed.</p>
          <p><strong>Date & Time:</strong> ${new Date(p.slotStart).toLocaleString()}</p>
          <p>Please arrive 10 minutes early.</p>
        `,
      });
      break;

    case 'cancellation':
      await sendEmail({
        to: p.patientEmail,
        subject: 'Appointment Cancelled — Healthcare Manager',
        html: `
          <h2>Appointment Cancelled</h2>
          <p>Dear <strong>${p.patientName}</strong>,</p>
          <p>Your appointment with <strong>${p.doctorName}</strong> on ${new Date(p.slotStart).toLocaleString()} has been cancelled.</p>
          <p>Please book a new appointment at your convenience.</p>
        `,
      });
      break;

    case 'reminder':
      await sendEmail({
        to: p.patientEmail,
        subject: 'Appointment Reminder — Tomorrow',
        html: `
          <h2>Appointment Reminder 📅</h2>
          <p>Dear <strong>${p.patientName}</strong>,</p>
          <p>This is a reminder for your appointment tomorrow with <strong>${p.doctorName}</strong>.</p>
          <p><strong>Time:</strong> ${new Date(p.slotStart).toLocaleString()}</p>
        `,
      });
      break;

    case 'leave_notice':
      await sendEmail({
        to: p.patientEmail,
        subject: 'Appointment Cancelled — Doctor on Leave',
        html: `
          <h2>Appointment Cancellation Notice</h2>
          <p>Dear <strong>${p.patientName}</strong>,</p>
          <p>We regret to inform you that your appointment with <strong>${p.doctorName}</strong> on ${new Date(p.slotStart).toLocaleString()} has been cancelled because the doctor will be on leave.</p>
          <p>We apologize for the inconvenience. Please book a new appointment.</p>
        `,
      });
      break;

    case 'med_reminder':
      await sendEmail({
        to: p.patientEmail,
        subject: `Medication Reminder: ${p.drug}`,
        html: `
          <h2>Medication Reminder 💊</h2>
          <p>Dear <strong>${p.patientName}</strong>,</p>
          <p>Time to take your medication:</p>
          <ul>
            <li><strong>Drug:</strong> ${p.drug}</li>
            <li><strong>Dosage:</strong> ${p.dosage}</li>
            <li><strong>Frequency:</strong> ${p.frequency}</li>
          </ul>
        `,
      });
      break;

    default:
      logger.warn(`Unknown notification type: ${type}`);
  }
}

async function handleCalendarNotification(notification) {
  const { type, payload, appointmentId } = notification;
  const p = typeof payload === 'string' ? JSON.parse(payload) : payload;

  switch (type) {
    case 'booking_confirm': {
      const result = await createCalendarEvent({
        summary: `Medical Appointment — ${p.doctorName}`,
        description: `Patient: ${p.patientName}\nDoctor: ${p.doctorName}`,
        start: p.slotStart,
        end: p.slotEnd,
        attendees: [p.patientEmail, p.doctorEmail].filter(Boolean),
      });

      if (result && result.id) {
        await prisma.calendarEvent.upsert({
          where: { appointmentId: appointmentId || p.appointmentId },
          create: {
            appointmentId: appointmentId || p.appointmentId,
            googleEventId: result.id,
            syncStatus: 'synced',
          },
          update: { googleEventId: result.id, syncStatus: 'synced' },
        });
      }
      break;
    }

    case 'cancellation': {
      if (p.googleEventId) {
        await deleteCalendarEvent(p.googleEventId);
        await prisma.calendarEvent.updateMany({
          where: { appointmentId: appointmentId || p.appointmentId },
          data: { syncStatus: 'failed', lastError: 'Cancelled by user' },
        });
      }
      break;
    }

    default:
      logger.debug(`Calendar notification type ${type} — no action`);
  }
}

let notificationWorker;

async function startWorkers() {
  notificationWorker = new Worker('notifications', processNotification, {
    connection: redisConnection,
    concurrency: 5,
  });

  notificationWorker.on('completed', (job) => {
    logger.debug(`Job ${job.id} completed`);
  });

  notificationWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });
}

async function stopWorkers() {
  if (notificationWorker) {
    await notificationWorker.close();
  }
}

module.exports = { startWorkers, stopWorkers };
