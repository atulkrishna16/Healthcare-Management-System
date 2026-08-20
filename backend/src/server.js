require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { startWorkers } = require('./jobs/workers');
const { startScheduledJobs } = require('./jobs/scheduler');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Start BullMQ workers
    await startWorkers();
    logger.info('✅ BullMQ workers started');

    // Start recurring scheduled jobs (expiry cleanup, reminders)
    await startScheduledJobs();
    logger.info('✅ Scheduled jobs started');

    app.listen(PORT, () => {
      logger.info(`🚀 Healthcare API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
