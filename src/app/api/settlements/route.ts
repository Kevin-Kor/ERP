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
        influencer: {
          select: {
            id: true,
            name: true,
            instagramId: true,
            bankAccount: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            client: {
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

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error("GET /api/settlements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}


