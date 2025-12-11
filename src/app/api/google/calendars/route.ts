import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleCalendarSync, refreshAccessToken } from "@/lib/google-calendar";
import { ensureGoogleConfigured } from "@/lib/google-config";

// GET - List user's Google Calendars
export async function GET(request: NextRequest) {
  try {
    ensureGoogleConfigured();

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
        googleCalendarId: true,
      },
    });

    if (!user?.googleAccessToken) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 401 }
      );
    }

    // Check if token needs refresh
    let accessToken = user.googleAccessToken;
    const now = new Date();
    const needsRefresh = !user.googleTokenExpiry || 
      user.googleTokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000;

    if (needsRefresh && user.googleRefreshToken) {
      try {
        const newTokens = await refreshAccessToken(user.googleRefreshToken);
        accessToken = newTokens.access_token!;
        
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            googleAccessToken: accessToken,
            googleTokenExpiry: newTokens.expiry_date 
              ? new Date(newTokens.expiry_date)
              : new Date(Date.now() + 3600 * 1000),
          },
        });
      } catch (err) {
        return NextResponse.json(
          { error: "Failed to refresh token" },
          { status: 401 }
        );
      }
    }

    const sync = new GoogleCalendarSync(accessToken);
    const calendars = await sync.listCalendars();

    return NextResponse.json({
      calendars: calendars.map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor,
      })),
      selectedCalendarId: user.googleCalendarId || "primary",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Google Calendar not configured") {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    console.error("List calendars error:", error);
    return NextResponse.json(
      { error: "Failed to list calendars" },
      { status: 500 }
    );
  }
}

// PATCH - Update selected calendar
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { calendarId } = await request.json();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { googleCalendarId: calendarId },
    });

    return NextResponse.json({ success: true, calendarId });
  } catch (error) {
    console.error("Update calendar error:", error);
    return NextResponse.json(
      { error: "Failed to update calendar" },
      { status: 500 }
    );
  }
}

