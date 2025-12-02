import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const events = await prisma.calendarEvent.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        Project: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    // Transform to lowercase field names
    const transformedEvents = events.map(e => ({
      ...e,
      project: e.Project,
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const event = await prisma.calendarEvent.create({
      data: {
        ...body,
        date: new Date(body.date),
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("POST /api/calendar error:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}


