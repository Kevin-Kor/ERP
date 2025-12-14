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
    return current > 0 ? "+∞%" : "-";
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

// 변화 이모지
function getChangeEmoji(current: number, previous: number): string {
  if (previous === 0) return "";
  const change = ((current - previous) / previous) * 100;
  if (change > 10) return "📈";
  if (change < -10) return "📉";
  return "";
}

// 월 범위 계산
function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// N개월 전 범위 계산
function getMonthRangeOffset(date: Date, offset: number): { start: Date; end: Date; label: string } {
  const targetDate = new Date(date.getFullYear(), date.getMonth() - offset, 1);
  const range = getMonthRange(targetDate);
  return {
    ...range,
    label: `${targetDate.getMonth() + 1}월`,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const thisMonth = getMonthRange(today);
    const lastMonth = getMonthRangeOffset(today, 1);
    const twoMonthsAgo = getMonthRangeOffset(today, 2);

    // ========== 1. 최근 3개월 매출/지출 조회 ==========
    const [thisMonthTx, lastMonthTx, twoMonthsAgoTx] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: thisMonth.start, lte: thisMonth.end } },
        include: { Client: { select: { name: true } } },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: lastMonth.start, lte: lastMonth.end } },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: twoMonthsAgo.start, lte: twoMonthsAgo.end } },
      }),
    ]);

    // 월별 매출/지출 계산
    const calcMonthStats = (transactions: typeof thisMonthTx) => {
      const revenue = transactions.filter((t) => t.type === "REVENUE").reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);
      return { revenue, expense, profit: revenue - expense };
    };

    const thisMonthStats = calcMonthStats(thisMonthTx);
    const lastMonthStats = calcMonthStats(lastMonthTx);
    const twoMonthsAgoStats = calcMonthStats(twoMonthsAgoTx);

    const profitMargin = thisMonthStats.revenue > 0
      ? ((thisMonthStats.profit / thisMonthStats.revenue) * 100).toFixed(1)
      : "0";

    // ========== 2. 지출 카테고리별 분석 ==========
    const expenseByCategory = thisMonthTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

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

    const topExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([cat, amount]: [string, number]) => ({
        category: categoryLabels[cat] || cat,
        amount,
        percent: thisMonthStats.expense > 0 ? ((amount / thisMonthStats.expense) * 100).toFixed(0) : "0",
      }));

    // ========== 3. 수입 카테고리별 분석 ==========
    const revenueByCategory = thisMonthTx
      .filter((t) => t.type === "REVENUE")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const revenueCategoryLabels: Record<string, string> = {
      FIXED_MANAGEMENT: "고정 관리비",
      PROJECT_MANAGEMENT: "프로젝트 관리",
      AD_REVENUE: "광고 수익",
      PLATFORM_REVENUE: "플랫폼 수익",
      CAMPAIGN_FEE: "캠페인 대행",
      CONSULTING: "컨설팅",
      OTHER_REVENUE: "기타",
    };

    const topRevenues = Object.entries(revenueByCategory)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([cat, amount]: [string, number]) => ({
        category: revenueCategoryLabels[cat] || cat,
        amount,
        percent: thisMonthStats.revenue > 0 ? ((amount / thisMonthStats.revenue) * 100).toFixed(0) : "0",
      }));

    // ========== 4. 클라이언트별 매출 ==========
    const revenueByClient = thisMonthTx
      .filter((t) => t.type === "REVENUE" && t.Client)
      .reduce((acc, t) => {
        const clientName = t.Client?.name || "미지정";
        acc[clientName] = (acc[clientName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topClients = Object.entries(revenueByClient)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([name, amount]: [string, number]) => ({
        name,
        amount,
        percent: thisMonthStats.revenue > 0 ? ((amount / thisMonthStats.revenue) * 100).toFixed(0) : "0",
      }));

    // ========== 5. 프로젝트 현황 ==========
    const [completedProjects, activeProjects, quotingProjects, newProjects] = await Promise.all([
      prisma.project.findMany({
        where: { status: "COMPLETED", updatedAt: { gte: thisMonth.start, lte: thisMonth.end } },
        include: { Client: { select: { name: true } } },
      }),
      prisma.project.count({ where: { status: "IN_PROGRESS" } }),
      prisma.project.count({ where: { status: "QUOTING" } }),
      prisma.project.count({
        where: { createdAt: { gte: thisMonth.start, lte: thisMonth.end } },
      }),
    ]);

    const totalContractAmount = completedProjects.reduce((sum, p) => sum + p.contractAmount, 0);

    // ========== 6. 클라이언트 현황 ==========
    const [newClients, activeClients, fixedVendors] = await Promise.all([
      prisma.client.count({
        where: { createdAt: { gte: thisMonth.start, lte: thisMonth.end } },
      }),
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.client.findMany({
        where: { isFixedVendor: true, status: "ACTIVE" },
        select: { name: true, monthlyFee: true },
      }),
    ]);

    const totalFixedRevenue = fixedVendors.reduce((sum, v) => sum + (v.monthlyFee || 0), 0);

    // ========== 7. 인플루언서 현황 ==========
    const activeInfluencers = await prisma.projectInfluencer.findMany({
      where: { createdAt: { gte: thisMonth.start, lte: thisMonth.end } },
      include: { Influencer: { select: { name: true } } },
      distinct: ["influencerId"],
    });

    // 인플루언서별 정산 현황
    const topInfluencers = await prisma.projectInfluencer.groupBy({
      by: ["influencerId"],
      where: { createdAt: { gte: thisMonth.start, lte: thisMonth.end } },
      _sum: { fee: true },
      _count: true,
      orderBy: { _sum: { fee: "desc" } },
      take: 5,
    });

    const topInfluencerDetails = await Promise.all(
      topInfluencers.map(async (ti) => {
        const inf = await prisma.influencer.findUnique({
          where: { id: ti.influencerId },
          select: { name: true },
        });
        return {
          name: inf?.name || "알 수 없음",
          fee: ti._sum.fee || 0,
          projectCount: ti._count,
        };
      })
    );

    // ========== 8. 정산 현황 ==========
    const [completedSettlements, pendingSettlements] = await Promise.all([
      prisma.projectInfluencer.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          paymentDate: { gte: thisMonth.start, lte: thisMonth.end },
        },
        _sum: { fee: true },
        _count: true,
      }),
      prisma.projectInfluencer.findMany({
        where: { paymentStatus: { in: ["PENDING", "REQUESTED"] } },
        include: { Influencer: { select: { name: true } } },
        orderBy: { paymentDueDate: "asc" },
      }),
    ]);

    const totalPendingFee = pendingSettlements.reduce((sum, s) => sum + s.fee, 0);
    const overdueSettlements = pendingSettlements.filter(
      (s) => s.paymentDueDate && s.paymentDueDate < today
    );

    // ========== 9. 미수금 현황 ==========
    const unpaidRevenue = await prisma.transaction.aggregate({
      where: { type: "REVENUE", paymentStatus: { not: "COMPLETED" } },
      _sum: { amount: true },
      _count: true,
    });

    // ========== 10. 세금계산서 현황 ==========
    const [taxInvoiceIssued, taxInvoicePending] = await Promise.all([
      prisma.document.count({
        where: {
          type: "TAX_INVOICE",
          issueDate: { gte: thisMonth.start, lte: thisMonth.end },
        },
      }),
      prisma.project.count({
        where: {
          status: "COMPLETED",
          Document: { none: { type: "TAX_INVOICE" } },
        },
      }),
    ]);

    // ========== 11. 다음 달 예정 ==========
    const nextMonth = getMonthRangeOffset(today, -1);
    const projectsNextMonth = await prisma.project.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "QUOTING"] },
        endDate: { gte: nextMonth.start, lte: nextMonth.end },
      },
      include: { Client: { select: { name: true } } },
      take: 5,
    });

    // ========== 리포트 메시지 생성 ==========
    const monthLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;

    let message = `📊 *월간 결산 리포트*\n`;
    message += `📅 ${monthLabel}\n`;
    message += `${"━".repeat(30)}\n\n`;

    // 💰 재무 요약
    message += `💰 *이번 달 재무 요약*\n`;
    message += `┌──────────────────────────────┐\n`;
    message += `│ 매출: ${formatAmount(thisMonthStats.revenue).padEnd(14)} ${getChangeEmoji(thisMonthStats.revenue, lastMonthStats.revenue)} ${getChangePercent(thisMonthStats.revenue, lastMonthStats.revenue)}\n`;
    message += `│ 지출: ${formatAmount(thisMonthStats.expense).padEnd(14)} ${getChangeEmoji(thisMonthStats.expense, lastMonthStats.expense)} ${getChangePercent(thisMonthStats.expense, lastMonthStats.expense)}\n`;
    message += `│ 순이익: ${formatAmount(thisMonthStats.profit)}\n`;
    message += `│ 이익률: ${profitMargin}%\n`;
    message += `└──────────────────────────────┘\n\n`;

    // 📈 최근 3개월 추이
    message += `📈 *최근 3개월 추이*\n`;
    message += `┌─────────┬──────────┬──────────┐\n`;
    message += `│         │  매출    │  순이익  │\n`;
    message += `├─────────┼──────────┼──────────┤\n`;
    message += `│ ${twoMonthsAgo.label.padEnd(7)}│ ${formatAmount(twoMonthsAgoStats.revenue).padEnd(8)}│ ${formatAmount(twoMonthsAgoStats.profit).padEnd(8)}│\n`;
    message += `│ ${lastMonth.label.padEnd(7)}│ ${formatAmount(lastMonthStats.revenue).padEnd(8)}│ ${formatAmount(lastMonthStats.profit).padEnd(8)}│\n`;
    message += `│ ${(today.getMonth() + 1) + "월".padEnd(6)}│ ${formatAmount(thisMonthStats.revenue).padEnd(8)}│ ${formatAmount(thisMonthStats.profit).padEnd(8)}│\n`;
    message += `└─────────┴──────────┴──────────┘\n\n`;

    // 🏆 클라이언트별 매출 TOP 5
    if (topClients.length > 0) {
      message += `🏆 *클라이언트별 매출 TOP 5*\n`;
      topClients.forEach((c, i) => {
        message += `${i + 1}. ${c.name}: ${formatAmount(c.amount)} (${c.percent}%)\n`;
      });
      message += `\n`;
    }

    // 💵 수입 구성
    if (topRevenues.length > 0) {
      message += `💵 *수입 구성*\n`;
      topRevenues.forEach((r, i) => {
        message += `${i + 1}. ${r.category}: ${formatAmount(r.amount)} (${r.percent}%)\n`;
      });
      if (totalFixedRevenue > 0) {
        message += `   └ 고정 거래처 수익: ${formatAmount(totalFixedRevenue)} (${fixedVendors.length}곳)\n`;
      }
      message += `\n`;
    }

    // 📉 지출 분석 TOP 5
    if (topExpenses.length > 0) {
      message += `📉 *지출 분석 TOP 5*\n`;
      topExpenses.forEach((e, i) => {
        message += `${i + 1}. ${e.category}: ${formatAmount(e.amount)} (${e.percent}%)\n`;
      });
      message += `\n`;
    }

    // 📁 프로젝트 & 클라이언트
    message += `📁 *활동 현황*\n`;
    message += `• 신규 프로젝트: ${newProjects}건\n`;
    message += `• 완료 프로젝트: ${completedProjects.length}건 (계약금 ${formatAmount(totalContractAmount)})\n`;
    message += `• 진행 중: ${activeProjects}건 | 견적 중: ${quotingProjects}건\n`;
    message += `• 신규 클라이언트: ${newClients}건 | 활성 클라이언트: ${activeClients}건\n\n`;

    // 👤 인플루언서 현황
    message += `👤 *인플루언서 현황*\n`;
    message += `• 이번 달 협업: ${activeInfluencers.length}명\n`;
    if (topInfluencerDetails.length > 0) {
      message += `• 협업 TOP 3:\n`;
      topInfluencerDetails.slice(0, 3).forEach((inf, i) => {
        message += `  ${i + 1}. ${inf.name}: ${formatAmount(inf.fee)} (${inf.projectCount}건)\n`;
      });
    }
    message += `\n`;

    // 💸 정산 현황
    message += `💸 *정산 현황*\n`;
    message += `• 이번 달 완료: ${formatAmount(completedSettlements._sum.fee || 0)} (${completedSettlements._count}건)\n`;
    message += `• 대기 중: ${formatAmount(totalPendingFee)} (${pendingSettlements.length}건)\n`;
    if (overdueSettlements.length > 0) {
      message += `• 🔴 연체: ${overdueSettlements.length}건 (${formatAmount(overdueSettlements.reduce((sum, s) => sum + s.fee, 0))})\n`;
    }
    message += `\n`;

    // ⚠️ 미결 현황
    message += `⚠️ *미결 현황*\n`;
    message += `• 미수금: ${formatAmount(unpaidRevenue._sum.amount || 0)} (${unpaidRevenue._count}건)\n`;
    message += `• 세금계산서 발행: ${taxInvoiceIssued}건 | 미발행: ${taxInvoicePending}건\n\n`;

    // ⏰ 다음 달 예정
    if (projectsNextMonth.length > 0) {
      message += `⏰ *${today.getMonth() + 2}월 마감 예정* (${projectsNextMonth.length}건)\n`;
      projectsNextMonth.forEach((p) => {
        const endDate = new Date(p.endDate);
        message += `• ${p.Client.name} - ${p.name} (${endDate.getMonth() + 1}/${endDate.getDate()})\n`;
      });
      message += `\n`;
    }

    message += `${"━".repeat(30)}\n`;
    message += `_매월 1일 오전 9시 자동 발송_`;

    // Slack으로 전송
    if (SLACK_CHANNEL_ID) {
      await sendSlackMessage(SLACK_CHANNEL_ID, message);
    }

    return NextResponse.json({
      success: true,
      message: "월간 리포트 발송 완료",
      data: {
        period: monthLabel,
        revenue: thisMonthStats.revenue,
        expense: thisMonthStats.expense,
        profit: thisMonthStats.profit,
        profitMargin: parseFloat(profitMargin),
        completedProjects: completedProjects.length,
        newClients,
        activeInfluencers: activeInfluencers.length,
        pendingSettlements: pendingSettlements.length,
        overdueSettlements: overdueSettlements.length,
        taxInvoicePending,
        trend: {
          twoMonthsAgo: twoMonthsAgoStats,
          lastMonth: lastMonthStats,
          thisMonth: thisMonthStats,
        },
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
