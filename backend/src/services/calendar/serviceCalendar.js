/**
 * Service Account Calendar Service
 * Handles Google Calendar operations using a shared clinic Service Account.
 * Used as fallback when a user hasn't connected personal Google Calendar.
 */
const { google } = require('googleapis');
const fs = require('fs');
const logger = require('../../utils/logger');

let calendarClient = null;

function getServiceAccountCalendar() {
  if (calendarClient) return calendarClient;

  let sa = null;
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH)) {
      sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, 'utf8'));
    } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      sa = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }
  } catch (e) {
    logger.warn('Failed to parse Google Service Account credentials', e.message);
  }

  if (!sa?.client_email || !sa?.private_key) return null;

  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
}

const calendarId = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

const buildTimeFields = (start, end) => ({
  start: { dateTime: new Date(start).toISOString(), timeZone: 'UTC' },
  end: { dateTime: new Date(end).toISOString(), timeZone: 'UTC' },
});

const DEFAULT_REMINDERS = {
  useDefault: false,
  overrides: [{ method: 'email', minutes: 24 * 60 }, { method: 'popup', minutes: 30 }],
};

async function insertServiceEvent({ summary, description, start, end, attendees = [] }) {
  const cal = getServiceAccountCalendar();
  if (!cal) return null;

  try {
    const response = await cal.events.insert({
      calendarId: calendarId(),
      sendUpdates: 'all',
      requestBody: {
        summary,
        description,
        ...buildTimeFields(start, end),
        attendees: attendees.map((email) => ({ email })),
        reminders: DEFAULT_REMINDERS,
      },
    });
    logger.info(`Service account calendar event created: ${response.data.id}`);
    return response.data;
  } catch (err) {
    logger.error('Failed to create Service Account calendar event', err.message);
    return null;
  }
}

async function patchServiceEvent(eventId, { summary, description, start, end, attendees }) {
  if (!eventId) return null;
  const cal = getServiceAccountCalendar();
  if (!cal) return null;

  try {
    const response = await cal.events.patch({
      calendarId: calendarId(),
      eventId,
      sendUpdates: 'all',
      requestBody: {
        ...(summary && { summary }),
        ...(description && { description }),
        ...(start && end ? buildTimeFields(start, end) : {}),
        ...(attendees && { attendees: attendees.map((email) => ({ email })) }),
      },
    });
    return response.data;
  } catch (err) {
    logger.error(`Failed to patch Service Account calendar event ${eventId}`, err.message);
    return null;
  }
}

async function deleteServiceEvent(eventId) {
  if (!eventId) return;
  const cal = getServiceAccountCalendar();
  if (!cal) return;

  try {
    await cal.events.delete({ calendarId: calendarId(), eventId, sendUpdates: 'all' });
  } catch (err) {
    logger.error(`Failed to delete Service Account calendar event ${eventId}`, err.message);
  }
}

module.exports = { insertServiceEvent, patchServiceEvent, deleteServiceEvent };
