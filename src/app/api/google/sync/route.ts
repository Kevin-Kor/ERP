import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GoogleCalendarSync,
  erpEventToGoogleEvent,
  googleEventToErpEvent,
  refreshAccessToken
} from "@/lib/google-calendar";
import { ensureGoogleConfigured } from "@/lib/google-config";

// Helper to get valid access token (refresh if needed)
async function getValidAccessToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
      googleCalendarId: true,
      googleSyncEnabled: true,
    },
  });

  if (!user?.googleAccessToken || !user?.googleSyncEnabled) {
    return null;
  }

  // Check if token is expired or will expire in 5 minutes
  const now = new Date();
  const expiry = user.googleTokenExpiry;
  const needsRefresh = !expiry || expiry.getTime() - now.getTime() < 5 * 60 * 1000;

  if (needsRefresh && user.googleRefreshToken) {
    try {
      const newTokens = await refreshAccessToken(user.googleRefreshToken);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: newTokens.access_token!,
          googleTokenExpiry: newTokens.expiry_date 
            ? new Date(newTokens.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      });

      return {
        accessToken: newTokens.access_token!,
        calendarId: user.googleCalendarId || "primary",
      };
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }

  return {
    accessToken: user.googleAccessToken,
    calendarId: user.googleCalendarId || "primary",
  };
}

// GET - Get sync status
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
        googleSyncEnabled: true,
        googleCalendarId: true,
        googleAccessToken: true,
      },
    });

    const isConnected = !!(user?.googleAccessToken && user?.googleSyncEnabled);

    // Get last synced events count
    const syncedCount = await prisma.calendarEvent.count({
      where: {
        userId: session.user.id,
        googleEventId: { not: null },
      },
    });

    return NextResponse.json({
      connected: isConnected,
      calendarId: user?.googleCalendarId || "primary",
      syncedEventsCount: syncedCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Google Calendar not configured") {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    console.error("Get sync status error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}

// POST - Perform sync operation
export async function POST(request: NextRequest) {
  try {
    ensureGoogleConfigured();

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // "push", "pull", or "full"

    const tokenData = await getValidAccessToken(session.user.id);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: "Google Calendar not connected or token expired" },
        { status: 401 }
      );
    }

    const sync = new GoogleCalendarSync(tokenData.accessToken, tokenData.calendarId);
    const results = {
      pushed: 0,
      pulled: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Get date range (current month ± 1 month)
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    if (action === "push" || action === "full") {
      // Push ERP events to Google Calendar
      const erpEvents = await prisma.calendarEvent.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: timeMin,
            lte: timeMax,
          },
        },
        include: {
          Project: { select: { name: true } },
        },
      });

      for (const erpEvent of erpEvents) {
        try {
          const googleEvent = erpEventToGoogleEvent({
            title: erpEvent.title,
            date: erpEvent.date,
            endDate: erpEvent.endDate,
            type: erpEvent.type,
            memo: erpEvent.memo,
            project: erpEvent.Project,
          });

          if (erpEvent.googleEventId) {
            // Update existing Google event
            await sync.updateEvent(erpEvent.googleEventId, googleEvent);
            results.updated++;
          } else {
            // Create new Google event
            const created = await sync.createEvent(googleEvent);
            await prisma.calendarEvent.update({
              where: { id: erpEvent.id },
              data: {
                googleEventId: created.id,
                syncedAt: new Date(),
              },
            });
            results.pushed++;
          }
        } catch (err) {
          results.errors.push(`Push failed for "${erpEvent.title}": ${err}`);
        }
      }
    }

    if (action === "pull" || action === "full") {
      // Pull Google Calendar events to ERP
      const googleEvents = await sync.listEvents(timeMin, timeMax);

      for (const googleEvent of googleEvents) {
        // Skip events that are already synced from ERP
        if (googleEvent.description?.includes("[ERP 동기화 일정]")) {
          continue;
        }

        try {
          // Check if event already exists in ERP
          const existing = await prisma.calendarEvent.findFirst({
            where: {
              googleEventId: googleEvent.id,
              userId: session.user.id,
            },
          });

          const erpEventData = googleEventToErpEvent(googleEvent);

          if (existing) {
            // Update existing ERP event
            await prisma.calendarEvent.update({
              where: { id: existing.id },
              data: {
                title: erpEventData.title,
                date: erpEventData.date,
                endDate: erpEventData.endDate,
                memo: erpEventData.memo,
                syncedAt: new Date(),
              },
            });
            results.updated++;
          } else {
            // Create new ERP event
            await prisma.calendarEvent.create({
              data: {
                title: erpEventData.title,
                date: erpEventData.date,
                endDate: erpEventData.endDate,
                type: erpEventData.type,
                memo: erpEventData.memo,
                googleEventId: googleEvent.id,
                userId: session.user.id,
                syncedAt: new Date(),
              },
            });
            results.pulled++;
          }
        } catch (err) {
          results.errors.push(`Pull failed for "${googleEvent.summary}": ${err}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Google Calendar not configured") {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}

// PUT - Enable/disable auto-sync (webhook)
export async function PUT(request: NextRequest) {
  try {
    ensureGoogleConfigured();

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled } = await request.json();
    const tokenData = await getValidAccessToken(session.user.id);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 401 }
      );
    }

    const sync = new GoogleCalendarSync(tokenData.accessToken, tokenData.calendarId);
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/google/webhook`;
    const channelId = `erp-calendar-${session.user.id}-${Date.now()}`;

    if (enabled) {
      try {
        // Start watching calendar
        const watchResponse = await sync.watchCalendar(webhookUrl, channelId);
        
        // Store channel info for later cleanup (optional: could store in DB)
        console.log("Webhook registered:", watchResponse);
        
        return NextResponse.json({ 
          success: true, 
          message: "Auto-sync enabled",
          expiration: watchResponse.expiration,
        });
      } catch (err: any) {
        console.error("Watch calendar error:", err);
        return NextResponse.json(
          { error: err.message || "Failed to enable auto-sync" },
          { status: 500 }
        );
      }
    } else {
      // For now, just acknowledge - stopping requires resourceId
      return NextResponse.json({ 
        success: true, 
        message: "Auto-sync disabled" 
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Google Calendar not configured") {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    console.error("Auto-sync toggle error:", error);
    return NextResponse.json(
      { error: "Failed to toggle auto-sync" },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleCalendarId: null,
        googleSyncEnabled: false,
      },
    });

    // Optionally clear googleEventId from all events
    await prisma.calendarEvent.updateMany({
      where: { userId: session.user.id },
      data: {
        googleEventId: null,
        syncedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}

