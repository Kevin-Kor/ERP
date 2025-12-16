import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month"); // YYYY-MM format

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status && status !== "all") {
      where.paymentStatus = status;
    }

    // 월별 필터링 (촬영일 또는 정산마감일 기준)
    if (month) {
      const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      where.OR = [
        {
          shootingDate: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        {
          paymentDueDate: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        {
          AND: [
            { shootingDate: null },
            { paymentDueDate: null },
            {
              createdAt: {
                gte: startOfMonth,
                lt: endOfMonth,
              },
            },
          ],
        },
      ];
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
        { shootingDate: "asc" },
        { paymentDueDate: "asc" },
      ],
    });

    // Transform to lowercase field names
    const transformedSettlements = settlements.map((s) => ({
      ...s,
      influencer: s.Influencer,
      project: {
        ...s.Project,
        client: s.Project.Client,
      },
    }));

    // 월별 통계 계산
    const totalFee = settlements.reduce((sum, s) => sum + s.fee, 0);
    const pendingFee = settlements
      .filter((s) => s.paymentStatus === "PENDING")
      .reduce((sum, s) => sum + s.fee, 0);
    const requestedFee = settlements
      .filter((s) => s.paymentStatus === "REQUESTED")
      .reduce((sum, s) => sum + s.fee, 0);
    const completedFee = settlements
      .filter((s) => s.paymentStatus === "COMPLETED")
      .reduce((sum, s) => sum + s.fee, 0);

    return NextResponse.json({
      settlements: transformedSettlements,
      summary: {
        total: totalFee,
        pending: pendingFee,
        requested: requestedFee,
        completed: completedFee,
        count: settlements.length,
        pendingCount: settlements.filter((s) => s.paymentStatus === "PENDING").length,
        requestedCount: settlements.filter((s) => s.paymentStatus === "REQUESTED").length,
        completedCount: settlements.filter((s) => s.paymentStatus === "COMPLETED").length,
      },
    });
  } catch (error) {
    console.error("GET /api/settlements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}


