import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Google OAuth2 client configuration
export function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Generate OAuth URL for user authorization
export function getAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    prompt: "consent",
    state: state,
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Get Google Calendar client
export function getCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.calendar({ version: "v3", auth: oauth2Client });
}

// Event type mapping from ERP to Google
const ERP_TO_GOOGLE_COLOR: Record<string, string> = {
  PROJECT: "9",      // Blue
  CONTENT: "7",      // Cyan
  SETTLEMENT: "5",   // Yellow
  PAYMENT: "10",     // Green
  INVOICE: "11",     // Red
  MEETING: "6",      // Orange
  DEADLINE: "4",     // Flamingo
  CUSTOM: "8",       // Graphite
};

// Convert ERP event to Google Calendar event format
export function erpEventToGoogleEvent(event: {
  title: string;
  date: string | Date;
  endDate?: string | Date | null;
  type: string;
  memo?: string | null;
  project?: { name: string } | null;
}): calendar_v3.Schema$Event {
  const startDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate);
  
  // If no end date, set it to same day (all-day event)
  if (!event.endDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const description = [
    event.memo,
    event.project ? `프로젝트: ${event.project.name}` : null,
    `유형: ${event.type}`,
    "[ERP 동기화 일정]",
  ].filter(Boolean).join("\n");

  return {
    summary: event.title,
    description,
    start: {
      date: startDate.toISOString().split("T")[0],
      timeZone: "Asia/Seoul",
    },
    end: {
      date: endDate.toISOString().split("T")[0],
      timeZone: "Asia/Seoul",
    },
    colorId: ERP_TO_GOOGLE_COLOR[event.type] || "8",
  };
}

// Convert Google Calendar event to ERP event format
export function googleEventToErpEvent(event: calendar_v3.Schema$Event): {
  title: string;
  date: Date;
  endDate: Date | null;
  type: string;
  memo: string | null;
  googleEventId: string;
} {
  const startDate = event.start?.date || event.start?.dateTime;
  const endDate = event.end?.date || event.end?.dateTime;

  // Determine event type from color or description
  let type = "CUSTOM";
  const description = event.description || "";
  
  if (description.includes("유형: ")) {
    const match = description.match(/유형: (\w+)/);
    if (match) {
      type = match[1];
    }
  }

  // Clean description (remove ERP metadata)
  const cleanDescription = description
    .replace(/유형: \w+\n?/g, "")
    .replace(/프로젝트: .+\n?/g, "")
    .replace(/\[ERP 동기화 일정\]\n?/g, "")
    .trim() || null;

  return {
    title: event.summary || "제목 없음",
    date: new Date(startDate!),
    endDate: endDate ? new Date(endDate) : null,
    type,
    memo: cleanDescription,
    googleEventId: event.id!,
  };
}

// Sync operations
export class GoogleCalendarSync {
  private calendar: calendar_v3.Calendar;
  private calendarId: string;

  constructor(accessToken: string, calendarId: string = "primary") {
    this.calendar = getCalendarClient(accessToken);
    this.calendarId = calendarId;
  }

  // List all calendars
  async listCalendars() {
    const response = await this.calendar.calendarList.list();
    return response.data.items || [];
  }

  // List events from Google Calendar
  async listEvents(timeMin?: Date, timeMax?: Date) {
    const response = await this.calendar.events.list({
      calendarId: this.calendarId,
      timeMin: timeMin?.toISOString(),
      timeMax: timeMax?.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
    });
    return response.data.items || [];
  }

  // Create event in Google Calendar
  async createEvent(event: calendar_v3.Schema$Event) {
    const response = await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: event,
    });
    return response.data;
  }

  // Update event in Google Calendar
  async updateEvent(eventId: string, event: calendar_v3.Schema$Event) {
    const response = await this.calendar.events.update({
      calendarId: this.calendarId,
      eventId,
      requestBody: event,
    });
    return response.data;
  }

  // Delete event from Google Calendar
  async deleteEvent(eventId: string) {
    await this.calendar.events.delete({
      calendarId: this.calendarId,
      eventId,
    });
  }

  // Get single event
  async getEvent(eventId: string) {
    const response = await this.calendar.events.get({
      calendarId: this.calendarId,
      eventId,
    });
    return response.data;
  }
}

