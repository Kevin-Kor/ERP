import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackMessage } from "@/lib/slack";

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;

// Cron 인증
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}

// 금액 포맷팅
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1).replace(/\.0$/, "") + "만원";
  }
  return amount.toLocaleString("ko-KR") + "원";
}

// 퍼센트 변화율 계산
function getChangePercent(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+∞%" : "0%";
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

// 월 범위 계산
function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// 지난 달 범위 계산
function getLastMonthRange(date: Date): { start: Date; end: Date } {
  const lastMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return getMonthRange(lastMonth);
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const thisMonth = getMonthRange(today);
    const lastMonth = getLastMonthRange(today);

    // 1. 이번 달/지난 달 거래 조회
    const thisMonthTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: thisMonth.start, lte: thisMonth.end },
      },
    });

    const lastMonthTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: lastMonth.start, lte: lastMonth.end },
      },
    });

    // 매출/지출 계산
    const thisMonthRevenue = thisMonthTransactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const thisMonthExpense = thisMonthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
    const thisMonthProfit = thisMonthRevenue - thisMonthExpense;
    const profitMargin = thisMonthRevenue > 0
      ? ((thisMonthProfit / thisMonthRevenue) * 100).toFixed(1)
      : "0";

    const lastMonthRevenue = lastMonthTransactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const lastMonthExpense = lastMonthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    // 2. 카테고리별 지출 분석
    const expenseByCategory = thisMonthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const sortedExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 3. 이번 달 완료 프로젝트
    const completedProjects = await prisma.project.count({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: thisMonth.start, lte: thisMonth.end },
      },
    });

    // 4. 이번 달 신규 클라이언트
    const newClients = await prisma.client.count({
      where: {
        createdAt: { gte: thisMonth.start, lte: thisMonth.end },
      },
    });

    // 5. 이번 달 협업 인플루언서 수
    const activeInfluencers = await prisma.projectInfluencer.findMany({
      where: {
        createdAt: { gte: thisMonth.start, lte: thisMonth.end },
      },
      select: { influencerId: true },
      distinct: ["influencerId"],
    });

    // 6. 정산 완료/대기 현황
    const settlementStats = await prisma.projectInfluencer.groupBy({
      by: ["paymentStatus"],
      _count: true,
      _sum: { fee: true },
    });

    const completedSettlement = settlementStats.find((s) => s.paymentStatus === "COMPLETED");
    const pendingSettlement = settlementStats.filter((s) =>
      s.paymentStatus === "PENDING" || s.paymentStatus === "REQUESTED"
    );

    const totalPendingFee = pendingSettlement.reduce((sum, s) => sum + (s._sum.fee || 0), 0);
    const totalPendingCount = pendingSettlement.reduce((sum, s) => sum + s._count, 0);

    // 7. 상위 클라이언트 (매출 기준)
    const topClients = await prisma.transaction.groupBy({
      by: ["clientId"],
      where: {
        type: "REVENUE",
        date: { gte: thisMonth.start, lte: thisMonth.end },
        clientId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 3,
    });

    const topClientDetails = await Promise.all(
      topClients.map(async (tc) => {
        const client = await prisma.client.findUnique({
          where: { id: tc.clientId! },
          select: { name: true },
        });
        return {
          name: client?.name || "알 수 없음",
          amount: tc._sum.amount || 0,
        };
      })
    );

    // 카테고리 한글 매핑
    const categoryLabels: Record<string, string> = {
      FOOD: "식비",
      TRANSPORTATION: "교통비",
      SUPPLIES: "사무용품",
      AD_EXPENSE: "광고비",
      INFLUENCER_FEE: "인플루언서",
      CONTENT_PRODUCTION: "콘텐츠 제작",
      OPERATIONS: "운영비",
      SALARY: "급여",
      OFFICE_RENT: "임대료",
      OTHER_EXPENSE: "기타",
    };

    // 리포트 메시지 생성
    const monthLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;

    let message = `📊 *월간 현황 리포트*\n`;
    message += `📅 ${monthLabel}\n`;
    message += `${"━".repeat(25)}\n\n`;

    // 재무 요약
    message += `💰 *재무 요약*\n`;
    message += `• 매출: ${formatAmount(thisMonthRevenue)} (${getChangePercent(thisMonthRevenue, lastMonthRevenue)})\n`;
    message += `• 지출: ${formatAmount(thisMonthExpense)} (${getChangePercent(thisMonthExpense, lastMonthExpense)})\n`;
    message += `• 순이익: ${formatAmount(thisMonthProfit)}\n`;
    message += `• 이익률: ${profitMargin}%\n\n`;

    // 지출 카테고리 Top 5
    if (sortedExpenses.length > 0) {
      message += `📉 *지출 상위 카테고리*\n`;
      sortedExpenses.forEach(([category, amount]: [string, number], index) => {
        const label = categoryLabels[category] || category;
        const percent = ((amount / thisMonthExpense) * 100).toFixed(1);
        message += `${index + 1}. ${label}: ${formatAmount(amount)} (${percent}%)\n`;
      });
      message += `\n`;
    }

    // 프로젝트 & 클라이언트
    message += `📁 *활동 현황*\n`;
    message += `• 완료 프로젝트: ${completedProjects}건\n`;
    message += `• 신규 클라이언트: ${newClients}건\n`;
    message += `• 협업 인플루언서: ${activeInfluencers.length}명\n\n`;

    // 정산 현황
    message += `💸 *정산 현황*\n`;
    message += `• 완료: ${formatAmount(completedSettlement?._sum.fee || 0)} (${completedSettlement?._count || 0}건)\n`;
    message += `• 대기: ${formatAmount(totalPendingFee)} (${totalPendingCount}건)\n\n`;

    // 상위 클라이언트
    if (topClientDetails.length > 0) {
      message += `🏆 *매출 상위 클라이언트*\n`;
      topClientDetails.forEach((client, index) => {
        message += `${index + 1}. ${client.name}: ${formatAmount(client.amount)}\n`;
      });
    }

    message += `\n${"━".repeat(25)}\n`;
    message += `_자동 생성된 리포트입니다._`;

    // Slack으로 전송
    if (SLACK_CHANNEL_ID) {
      await sendSlackMessage(SLACK_CHANNEL_ID, message);
    }

    return NextResponse.json({
      success: true,
      message: "월간 리포트 발송 완료",
      data: {
        period: monthLabel,
        revenue: thisMonthRevenue,
        expense: thisMonthExpense,
        profit: thisMonthProfit,
        profitMargin: parseFloat(profitMargin),
        completedProjects,
        newClients,
        activeInfluencers: activeInfluencers.length,
        pendingSettlements: totalPendingCount,
        topCategories: sortedExpenses.map(([cat, amt]) => ({
          category: categoryLabels[cat] || cat,
          amount: amt,
        })),
      },
    });
  } catch (error) {
    console.error("월간 리포트 생성 오류:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - 수동 테스트용
export async function GET(request: NextRequest) {
  return POST(request);
}
