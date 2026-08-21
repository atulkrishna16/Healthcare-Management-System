/**
 * User OAuth2 Calendar Service
 * Handles Google Calendar operations using a specific user's OAuth2 refresh token.
 * Used when the patient/doctor has connected their personal Google account.
 */
const { google } = require('googleapis');
const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');

/**
 * Build an authenticated Google Calendar client for a user via their stored OAuth2 tokens.
 * Returns null if the user has not connected Google Calendar.
 */
async function getUserOAuthCalendar(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, isGoogleConnected: true },
  });

  if (!user?.isGoogleConnected || !user.googleRefreshToken) return null;

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

/**
 * Insert a new event into the user's primary Google Calendar.
 * Returns the created event data, or null on failure.
 */
async function insertUserEvent(userId, { summary, description, start, end }) {
  const cal = await getUserOAuthCalendar(userId);
  if (!cal) return null;

  try {
    const response = await cal.events.insert({
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
    logger.error(`OAuth2 event creation failed for user ${userId}: ${err.message}`);
    return null;
  }
}

/**
 * Patch an existing event in the user's primary Google Calendar.
 */
async function patchUserEvent(userId, eventId, fields) {
  if (!eventId) return null;
  const cal = await getUserOAuthCalendar(userId);
  if (!cal) return null;

  try {
    const { summary, description, start, end } = fields;
    const response = await cal.events.patch({
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
  } catch (err) {
    logger.error(`Failed to patch OAuth2 event ${eventId}: ${err.message}`);
    return null;
  }
}

/**
 * Delete an event from the user's primary Google Calendar.
 */
async function deleteUserEvent(userId, eventId) {
  if (!eventId) return;
  const cal = await getUserOAuthCalendar(userId);
  if (!cal) return;

  try {
    await cal.events.delete({ calendarId: 'primary', eventId });
  } catch (err) {
    logger.error(`Failed to delete OAuth2 event ${eventId}: ${err.message}`);
  }
}

module.exports = { insertUserEvent, patchUserEvent, deleteUserEvent };

