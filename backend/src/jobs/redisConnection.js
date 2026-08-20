const IORedis = require('ioredis');
const logger = require('../utils/logger');

const isTest = process.env.NODE_ENV === 'test';
let hasLoggedError = false;

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (isTest || times > 3) {
      if (!hasLoggedError) {
        logger.warn('⚠️  Redis is unreachable. Background worker queues are paused. Set REDIS_URL to an Upstash instance or start local Redis to enable background jobs.');
        hasLoggedError = true;
      }
      return 10000; // Retry slowly in background every 10s without spamming
    }
    return 1000;
  },
});

redisConnection.on('connect', () => {
  hasLoggedError = false;
  logger.info('✅ Redis connected successfully');
});

redisConnection.on('error', (err) => {
  if (!hasLoggedError) {
    logger.warn(`⚠️  Redis connection issue (${err.message}). Set REDIS_URL in .env to an Upstash Redis URL.`);
    hasLoggedError = true;
  }
});

module.exports = { redisConnection };
