const { google } = require('googleapis');
const logger = require('../../utils/logger');
const fs = require('fs');

let calendarClient;

function getCalendar() {
  if (calendarClient) return calendarClient;

  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    logger.warn('Google service account not configured — calendar sync disabled');
    return null;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
}

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

/**
 * Create a Google Calendar event.
 */
async function createCalendarEvent({ summary, description, start, end, attendees = [] }) {
  const calendar = getCalendar();
  if (!calendar) return null;

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID(),
    requestBody: {
      summary,
      description,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      attendees: attendees.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [{ method: 'email', minutes: 24 * 60 }, { method: 'popup', minutes: 30 }],
      },
    },
  });

  logger.info(`Calendar event created: ${response.data.id}`);
  return response.data;
}

/**
 * Update an existing Google Calendar event.
 */
async function patchCalendarEvent(eventId, { summary, description, start, end, attendees }) {
  const calendar = getCalendar();
  if (!calendar || !eventId) return null;

  const response = await calendar.events.patch({
    calendarId: CALENDAR_ID(),
    eventId,
    requestBody: {
      ...(summary && { summary }),
      ...(description && { description }),
      ...(start && { start: { dateTime: start, timeZone: 'UTC' } }),
      ...(end && { end: { dateTime: end, timeZone: 'UTC' } }),
      ...(attendees && { attendees: attendees.map((email) => ({ email })) }),
    },
  });

  logger.info(`Calendar event updated: ${eventId}`);
  return response.data;
}

/**
 * Delete a Google Calendar event.
 */
async function deleteCalendarEvent(eventId) {
  const calendar = getCalendar();
  if (!calendar || !eventId) return;

  await calendar.events.delete({
    calendarId: CALENDAR_ID(),
    eventId,
  });

  logger.info(`Calendar event deleted: ${eventId}`);
}

module.exports = { createCalendarEvent, patchCalendarEvent, deleteCalendarEvent };
