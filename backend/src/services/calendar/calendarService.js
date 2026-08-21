/**
 * calendarService — Public facade.
 * Composes userCalendar + serviceCalendar with automatic fallback:
 *   1. Try user's personal OAuth2 calendar (if connected)
 *   2. Fall back to clinic Service Account calendar
 */
const { insertUserEvent, patchUserEvent, deleteUserEvent } = require('./userCalendar');
const { insertServiceEvent, patchServiceEvent, deleteServiceEvent } = require('./serviceCalendar');

async function createCalendarEvent({ userId, summary, description, start, end, attendees = [] }) {
  if (userId) {
    const result = await insertUserEvent(userId, { summary, description, start, end });
    if (result) return result;
  }
  return insertServiceEvent({ summary, description, start, end, attendees });
}

async function patchCalendarEvent(eventId, { userId, summary, description, start, end, attendees }) {
  if (userId) {
    const result = await patchUserEvent(userId, eventId, { summary, description, start, end });
    if (result) return result;
  }
  return patchServiceEvent(eventId, { summary, description, start, end, attendees });
}

async function deleteCalendarEvent(eventId, userId) {
  if (userId) {
    await deleteUserEvent(userId, eventId);
    return;
  }
  await deleteServiceEvent(eventId);
}

module.exports = { createCalendarEvent, patchCalendarEvent, deleteCalendarEvent };
