const { Queue, QueueScheduler, Worker } = require('bullmq');
const { redisConnection } = require('./redisConnection');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

async function startScheduledJobs() {
  // ── Job 1: Expire held appointments every 60 seconds ──────────────────────
  const cleanupQueue = new Queue('cleanup', {
    connection: redisConnection,
    defaultJobOptions: { removeOnComplete: true, removeOnFail: { count: 10 } },
  });

  // Add a repeatable job
  await cleanupQueue.add(
    'expire-holds',
    {},
    {
      repeat: { every: 60 * 1000 }, // every 60 seconds
      jobId: 'expire-holds',
    }
  );

  const cleanupWorker = new Worker(
    'cleanup',
    async (job) => {
      if (job.name !== 'expire-holds') return;

      const result = await prisma.appointment.deleteMany({
        where: {
          status: 'held',
          holdExpiresAt: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        logger.info(`🧹 Cleaned up ${result.count} expired held appointments`);
      }
    },
    {
      connection: redisConnection,
    }
  );

  cleanupWorker.on('failed', (job, err) => {
    logger.error(`Cleanup job failed: ${err.message}`);
  });

  logger.info('✅ Scheduled jobs: hold-expiry (every 60s)');
}

module.exports = { startScheduledJobs };
