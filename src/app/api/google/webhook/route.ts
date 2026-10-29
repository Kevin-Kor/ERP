import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  GoogleCalendarSync,
  googleEventToErpEvent,
  refreshAccessToken,
  safeEqual,
} from "@/lib/google-calendar";

// POST - Receive webhook notifications from Google Calendar
// 외부(Google) 호출이라 proxy.ts는 통과시키고, 여기서 채널 토큰을 검증한다.
// 채널은 PUT /api/google/sync 로 자동 동기화를 켤 때 사용자별로 등록·저장된다.
export async function POST(request: NextRequest) {
  try {
    // Google sends channel ID, channel token and resource state in headers
    const channelId = request.headers.get("x-goog-channel-id");
    const channelToken = request.headers.get("x-goog-channel-token");
    const resourceState = request.headers.get("x-goog-resource-state");

    if (!channelId || !channelToken) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { googleChannelId: channelId },
    });

    if (!user?.googleChannelToken || !safeEqual(channelToken, user.googleChannelToken)) {
      console.warn("Google Calendar webhook rejected: unknown channel or bad token", { channelId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initial sync confirmation - just acknowledge
    if (resourceState === "sync") {
      return NextResponse.json({ received: true });
    }

    if (!user.googleSyncEnabled || !user.googleAccessToken) {
      return NextResponse.json({ received: true });
    }

    // Refresh token if needed
    let accessToken = user.googleAccessToken;
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

    // Get recent changes from Google Calendar (this channel's owner only)
    const sync = new GoogleCalendarSync(accessToken, user.googleCalendarId || "primary");

    // Sync last 30 days ~ next 90 days of events
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
export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint active" });
}
