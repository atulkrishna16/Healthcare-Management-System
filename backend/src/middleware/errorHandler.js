const logger = require('../utils/logger');

// Global error handler — must be the last middleware in Express
const errorHandler = (err, req, res, next) => {
  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Unique constraint violation', field: err.meta?.target });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Validation errors from express-validator (body)
  if (err.type === 'validation') {
    return res.status(422).json({ error: 'Validation failed', details: err.errors });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: err.message });
  }

  logger.error(err);

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
};

module.exports = errorHandler;
