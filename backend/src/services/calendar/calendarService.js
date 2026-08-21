const { google } = require('googleapis');
const logger = require('../../utils/logger');
const fs = require('fs');

let calendarClient;

function getCalendar() {
  if (calendarClient) return calendarClient;

  let serviceAccount = null;

  // 1. Direct JSON string from env var (e.g. on Render/Heroku)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      logger.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON', e);
    }
  }

  // 2. File path on disk
  if (!serviceAccount && process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    if (fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, 'utf8'));
      } catch (e) {
        logger.error('Failed to read service account file', e);
      }
    }
  }

  // 3. Individual credentials
  if (!serviceAccount && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    serviceAccount = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
    logger.warn('Google service account not configured — calendar sync disabled');
    return null;
  }

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

  try {
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID(),
      sendUpdates: 'all', // Dispatches Google Calendar invite email to attendees automatically
      requestBody: {
        summary,
        description,
        start: { dateTime: new Date(start).toISOString(), timeZone: 'UTC' },
        end: { dateTime: new Date(end).toISOString(), timeZone: 'UTC' },
        attendees: attendees.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [{ method: 'email', minutes: 24 * 60 }, { method: 'popup', minutes: 30 }],
        },
      },
    });

    logger.info(`Calendar event created: ${response.data.id}`);
    return response.data;
  } catch (err) {
    logger.error('Failed to create Google Calendar event', err.message);
    return null;
  }
}

/**
 * Update an existing Google Calendar event.
 */
async function patchCalendarEvent(eventId, { summary, description, start, end, attendees }) {
  const calendar = getCalendar();
  if (!calendar || !eventId) return null;

  try {
    const response = await calendar.events.patch({
      calendarId: CALENDAR_ID(),
      eventId,
      sendUpdates: 'all',
      requestBody: {
        ...(summary && { summary }),
        ...(description && { description }),
        ...(start && { start: { dateTime: new Date(start).toISOString(), timeZone: 'UTC' } }),
        ...(end && { end: { dateTime: new Date(end).toISOString(), timeZone: 'UTC' } }),
        ...(attendees && { attendees: attendees.map((email) => ({ email })) }),
      },
    });

    logger.info(`Calendar event updated: ${eventId}`);
    return response.data;
  } catch (err) {
    logger.error(`Failed to patch calendar event ${eventId}`, err.message);
    return null;
  }
}

/**
 * Delete a Google Calendar event.
 */
async function deleteCalendarEvent(eventId) {
  const calendar = getCalendar();
  if (!calendar || !eventId) return;

  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID(),
      eventId,
      sendUpdates: 'all',
    });

    logger.info(`Calendar event deleted: ${eventId}`);
  } catch (err) {
    logger.error(`Failed to delete calendar event ${eventId}`, err.message);
  }
}

module.exports = { createCalendarEvent, patchCalendarEvent, deleteCalendarEvent };
