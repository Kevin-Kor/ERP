import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  GoogleCalendarSync, 
  googleEventToErpEvent,
  refreshAccessToken 
} from "@/lib/google-calendar";

// POST - Receive webhook notifications from Google Calendar
export async function POST(request: NextRequest) {
  try {
    // Google sends channel ID and resource ID in headers
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceId = request.headers.get("x-goog-resource-id");
    const resourceState = request.headers.get("x-goog-resource-state");

    console.log("Google Calendar Webhook received:", {
      channelId,
      resourceId,
      resourceState,
    });

    // Verify this is a valid notification (not just sync message)
    if (resourceState === "sync") {
      // Initial sync confirmation - just acknowledge
      return NextResponse.json({ received: true });
    }

    if (!channelId) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    // Find user by channel ID (stored when setting up webhook)
    // For now, we'll sync all users with Google enabled
    const usersWithGoogle = await prisma.user.findMany({
      where: {
        googleSyncEnabled: true,
        googleAccessToken: { not: null },
      },
    });

    for (const user of usersWithGoogle) {
      try {
        // Refresh token if needed
        let accessToken = user.googleAccessToken!;
        const now = new Date();
        const needsRefresh = !user.googleTokenExpiry || 
          user.googleTokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000;

        if (needsRefresh && user.googleRefreshToken) {
          const newTokens = await refreshAccessToken(user.googleRefreshToken);
          accessToken = newTokens.access_token!;
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              googleAccessToken: accessToken,
              googleTokenExpiry: newTokens.expiry_date 
                ? new Date(newTokens.expiry_date)
                : new Date(Date.now() + 3600 * 1000),
            },
          });
        }

        // Get recent changes from Google Calendar
        const sync = new GoogleCalendarSync(accessToken, user.googleCalendarId || "primary");
        
        // Sync last 30 days of events
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 90);

        const googleEvents = await sync.listEvents(timeMin, timeMax);

        for (const googleEvent of googleEvents) {
          // Skip ERP-originated events
          if (googleEvent.description?.includes("[ERP 동기화 일정]")) {
            continue;
          }

          const erpEventData = googleEventToErpEvent(googleEvent);

          // Check if event exists
          const existing = await prisma.calendarEvent.findFirst({
            where: {
              googleEventId: googleEvent.id,
              userId: user.id,
            },
          });

          if (existing) {
            // Update existing event
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
          } else {
            // Create new event
            await prisma.calendarEvent.create({
              data: {
                title: erpEventData.title,
                date: erpEventData.date,
                endDate: erpEventData.endDate,
                type: erpEventData.type,
                memo: erpEventData.memo,
                googleEventId: googleEvent.id,
                userId: user.id,
                syncedAt: new Date(),
              },
            });
          }
        }
      } catch (err) {
        console.error(`Webhook sync failed for user ${user.id}:`, err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Verify endpoint for Google (responds to verification requests)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "Webhook endpoint active" });
}

