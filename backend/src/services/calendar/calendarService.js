const { google } = require('googleapis');
const logger = require('../../utils/logger');
const fs = require('fs');
const prisma = require('../../utils/prismaClient');

let calendarClient;

function getServiceAccountCalendar() {
  if (calendarClient) return calendarClient;

  let serviceAccount = null;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      logger.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON', e);
    }
  }

  if (!serviceAccount && process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    if (fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, 'utf8'));
      } catch (e) {
        logger.error('Failed to read service account file', e);
      }
    }
  }

  if (!serviceAccount && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    serviceAccount = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
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

/**
 * Get authenticated Google Calendar client for a specific user via their OAuth2 token.
 */
async function getUserOAuthCalendar(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      isGoogleConnected: true,
    },
  });

  if (!user || !user.isGoogleConnected || !user.googleRefreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/calendar/google/callback'
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

/**
 * Create a Google Calendar event on user's personal calendar (via OAuth2)
 * or clinic calendar (via Service Account).
 */
async function createCalendarEvent({ userId, summary, description, start, end, attendees = [] }) {
  // 1. Try user's personal OAuth2 Calendar first
  if (userId) {
    const userCal = await getUserOAuthCalendar(userId);
    if (userCal) {
      try {
        const response = await userCal.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary,
            description,
            start: { dateTime: new Date(start).toISOString(), timeZone: 'UTC' },
            end: { dateTime: new Date(end).toISOString(), timeZone: 'UTC' },
            reminders: {
              useDefault: false,
              overrides: [{ method: 'email', minutes: 24 * 60 }, { method: 'popup', minutes: 30 }],
            },
          },
        });
        logger.info(`OAuth2 Calendar event created on user's primary calendar: ${response.data.id}`);
        return response.data;
      } catch (err) {
        logger.error(`OAuth2 event creation failed for user ${userId}:`, err.message);
      }
    }
  }

  // 2. Fallback to Service Account calendar
  const serviceCal = getServiceAccountCalendar();
  if (!serviceCal) return null;

  try {
    const response = await serviceCal.events.insert({
      calendarId: CALENDAR_ID(),
      sendUpdates: 'all',
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

    logger.info(`Service account calendar event created: ${response.data.id}`);
    return response.data;
  } catch (err) {
    logger.error('Failed to create Service Account calendar event', err.message);
    return null;
  }
}

/**
 * Update an existing Google Calendar event.
 */
async function patchCalendarEvent(eventId, { userId, summary, description, start, end, attendees }) {
  if (userId) {
    const userCal = await getUserOAuthCalendar(userId);
    if (userCal && eventId) {
      try {
        const response = await userCal.events.patch({
          calendarId: 'primary',
          eventId,
          requestBody: {
            ...(summary && { summary }),
            ...(description && { description }),
            ...(start && { start: { dateTime: new Date(start).toISOString(), timeZone: 'UTC' } }),
            ...(end && { end: { dateTime: new Date(end).toISOString(), timeZone: 'UTC' } }),
          },
        });
        return response.data;
      } catch (e) {
        logger.error(`Failed to patch OAuth2 event ${eventId}:`, e.message);
      }
    }
  }

  const serviceCal = getServiceAccountCalendar();
  if (!serviceCal || !eventId) return null;

  try {
    const response = await serviceCal.events.patch({
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

    return response.data;
  } catch (err) {
    logger.error(`Failed to patch Service Account calendar event ${eventId}`, err.message);
    return null;
  }
}

/**
 * Delete a Google Calendar event.
 */
async function deleteCalendarEvent(eventId, userId) {
  if (userId) {
    const userCal = await getUserOAuthCalendar(userId);
    if (userCal && eventId) {
      try {
        await userCal.events.delete({ calendarId: 'primary', eventId });
        return;
      } catch (e) {
        logger.error(`Failed to delete OAuth2 event ${eventId}:`, e.message);
      }
    }
  }

  const serviceCal = getServiceAccountCalendar();
  if (!serviceCal || !eventId) return;

  try {
    await serviceCal.events.delete({
      calendarId: CALENDAR_ID(),
      eventId,
      sendUpdates: 'all',
    });
  } catch (err) {
    logger.error(`Failed to delete Service Account calendar event ${eventId}`, err.message);
  }
}

module.exports = {
  createCalendarEvent,
  patchCalendarEvent,
  deleteCalendarEvent,
  getUserOAuthCalendar,
};
