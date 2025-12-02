import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.paymentStatus = status;
    }

    const settlements = await prisma.projectInfluencer.findMany({
      where,
      include: {
        Influencer: {
          select: {
            id: true,
            name: true,
            instagramId: true,
            bankAccount: true,
          },
        },
        Project: {
          select: {
            id: true,
            name: true,
            Client: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { paymentStatus: "asc" },
        { paymentDueDate: "asc" },
      ],
    });

    // Transform to lowercase field names
    const transformedSettlements = settlements.map(s => ({
      ...s,
      influencer: s.Influencer,
      project: {
        ...s.Project,
        client: s.Project.Client,
      },
    }));

    return NextResponse.json({ settlements: transformedSettlements });
  } catch (error) {
    console.error("GET /api/settlements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}


