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

  await notificationQueue.add(
    `${type}:${channel}:${notification.id}`,
    { notificationId: notification.id },
    { delay }
  );

  logger.debug(`Enqueued notification ${notification.id} (${type}/${channel})`);
  return notification;
}

/**
 * Re-enqueue an existing notification by DB id (for admin retry)
 */
async function enqueueNotificationById(notificationId) {
  await notificationQueue.add(
    `retry:${notificationId}`,
    { notificationId },
    { delay: 0 }
  );
}

module.exports = { notificationQueue, enqueueNotification, enqueueNotificationById };
