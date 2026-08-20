const { Queue } = require('bullmq');
const { redisConnection } = require('./redisConnection');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Persist notification to DB, then enqueue BullMQ job.
 * Every notification is first stored in DB for reliability & admin visibility.
 */
async function enqueueNotification({ type, channel, payload, appointmentId, scheduledFor }) {
  const delay = scheduledFor ? Math.max(0, new Date(scheduledFor) - Date.now()) : 0;

  const notification = await prisma.notification.create({
    data: {
      type,
      channel,
      payload,
      status: 'pending',
      attempts: 0,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      ...(appointmentId && { appointmentId }),
    },
  });

  try {
    await notificationQueue.add(
      `${type}:${channel}:${notification.id}`,
      { notificationId: notification.id },
      { delay }
    );
    logger.debug(`Enqueued notification ${notification.id} (${type}/${channel})`);
  } catch (err) {
    logger.warn(`Could not add notification ${notification.id} to Redis queue: ${err.message}. Stored in DB.`);
  }

  return notification;
}

/**
 * Re-enqueue an existing notification by DB id (for admin retry)
 */
async function enqueueNotificationById(notificationId) {
  try {
    await notificationQueue.add(
      `retry:${notificationId}`,
      { notificationId },
      { delay: 0 }
    );
  } catch (err) {
    logger.warn(`Could not retry notification ${notificationId} in Redis: ${err.message}`);
  }
}

module.exports = { notificationQueue, enqueueNotification, enqueueNotificationById };
