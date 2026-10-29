import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { normalizeSettlementStatus, parseSettlementStatus } from "@/lib/settlement-status";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month"); // YYYY-MM format

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status && status !== "all") {
      const parsedStatus = parseSettlementStatus(status);
      if (!parsedStatus) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      where.paymentStatus = parsedStatus;
    }

    // 월별 필터링 (정산 완료 날짜 기준)
    if (month) {
      const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      where.OR = [
        {
          // 정산일(paymentDate)이 해당 월에 속하는 경우
          paymentDate: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        {
          // 정산일이 없는 경우, 정산마감일(paymentDueDate) 기준
          AND: [
            { paymentDate: null },
            {
              paymentDueDate: {
                gte: startOfMonth,
                lt: endOfMonth,
              },
            },
          ],
        },
        {
          // 정산일과 정산마감일이 모두 없는 경우, 생성일 기준
          AND: [
            { paymentDate: null },
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
      paymentStatus: normalizeSettlementStatus(s.paymentStatus),
      influencer: s.Influencer,
      project: {
        ...s.Project,
        client: s.Project.Client,
      },
    }));

    // 월별 통계 계산 (화면에 내려주는 값과 같은 정규화된 상태 기준)
    const sumBy = (status: string) =>
      transformedSettlements
        .filter((s) => s.paymentStatus === status)
        .reduce((sum, s) => sum + s.fee, 0);
    const countBy = (status: string) =>
      transformedSettlements.filter((s) => s.paymentStatus === status).length;
    const totalFee = transformedSettlements.reduce((sum, s) => sum + s.fee, 0);

    return NextResponse.json({
      settlements: transformedSettlements,
      summary: {
        total: totalFee,
        pending: sumBy("PENDING"),
        requested: sumBy("REQUESTED"),
        completed: sumBy("COMPLETED"),
        count: transformedSettlements.length,
        pendingCount: countBy("PENDING"),
        requestedCount: countBy("REQUESTED"),
        completedCount: countBy("COMPLETED"),
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


