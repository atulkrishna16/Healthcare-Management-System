require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { startWorkers } = require('./jobs/workers');
const { startScheduledJobs } = require('./jobs/scheduler');

const PORT = process.env.PORT || 3001;

async function start() {
  // Start Express API Server
  app.listen(PORT, () => {
    logger.info(`🚀 Healthcare API server listening on http://localhost:${PORT}`);
  });

  // Attempt to initialize background queues asynchronously
  try {
    await startWorkers();
    logger.info('✅ BullMQ background workers initialized');
    await startScheduledJobs();
    logger.info('✅ Scheduled background jobs started');
  } catch (err) {
    logger.warn(`⚠️  Background workers paused (${err.message}). API server remains fully operational.`);
  }
}

start();
