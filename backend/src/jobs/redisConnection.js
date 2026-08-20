const IORedis = require('ioredis');
const logger = require('../utils/logger');

const isTest = process.env.NODE_ENV === 'test';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: isTest,
  retryStrategy: (times) => {
    if (isTest && times > 1) return null; // Do not retry indefinitely during tests
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => logger.info('Redis connected'));
redisConnection.on('error', (err) => {
  if (!isTest) logger.error('Redis error:', err);
});

module.exports = { redisConnection };
