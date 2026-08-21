/**
 * Centralised dayjs date utilities with UTC + timezone plugins pre-loaded.
 * Import helpers from here; import dayjs itself directly from 'dayjs'.
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Add minutes to a Date and return a new Date.
 * @param {Date|string} start
 * @param {number} durationMinutes
 * @returns {Date}
 */
function addMinutes(start, durationMinutes) {
  return new Date(new Date(start).getTime() + durationMinutes * 60 * 1000);
}

module.exports = { addMinutes };
