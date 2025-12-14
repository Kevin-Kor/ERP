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

// 이번 주 시작/끝 날짜 계산 (월요일 시작)
function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// 지난 주 시작/끝 날짜 계산
function getLastWeekRange(date: Date): { start: Date; end: Date } {
  const thisWeek = getWeekRange(date);
  const lastWeekEnd = new Date(thisWeek.start);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
  lastWeekStart.setHours(0, 0, 0, 0);

  return { start: lastWeekStart, end: lastWeekEnd };
}

// 다음 주 시작/끝 날짜 계산
function getNextWeekRange(date: Date): { start: Date; end: Date } {
  const thisWeek = getWeekRange(date);
  const nextWeekStart = new Date(thisWeek.end);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  nextWeekStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
  nextWeekEnd.setHours(23, 59, 59, 999);

  return { start: nextWeekStart, end: nextWeekEnd };
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const thisWeek = getWeekRange(today);
    const lastWeek = getLastWeekRange(today);
    const nextWeek = getNextWeekRange(today);

    // 1. 이번 주/지난 주 거래 조회
    const thisWeekTransactions = await prisma.transaction.findMany({
      where: { date: { gte: thisWeek.start, lte: thisWeek.end } },
      include: { Client: { select: { name: true } } },
    });

    const lastWeekTransactions = await prisma.transaction.findMany({
      where: { date: { gte: lastWeek.start, lte: lastWeek.end } },
    });

    // 매출/지출 계산
    const thisWeekRevenue = thisWeekTransactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const thisWeekExpense = thisWeekTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
    const thisWeekProfit = thisWeekRevenue - thisWeekExpense;

    const lastWeekRevenue = lastWeekTransactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const lastWeekExpense = lastWeekTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    // 2. 지출 카테고리별 분석
    const expenseByCategory = thisWeekTransactions
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
      .slice(0, 3)
      .map(([cat, amount]: [string, number]) => ({
        category: categoryLabels[cat] || cat,
        amount,
        percent: thisWeekExpense > 0 ? ((amount / thisWeekExpense) * 100).toFixed(0) : "0",
      }));

    // 3. 클라이언트별 이번 주 매출
    const revenueByClient = thisWeekTransactions
      .filter((t) => t.type === "REVENUE" && t.Client)
      .reduce((acc, t) => {
        const clientName = t.Client?.name || "미지정";
        acc[clientName] = (acc[clientName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topClients = Object.entries(revenueByClient)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([name, amount]: [string, number]) => ({ name, amount }));

    // 4. 미수금 현황
    const unpaidRevenue = await prisma.transaction.aggregate({
      where: {
        type: "REVENUE",
        paymentStatus: { not: "COMPLETED" },
      },
      _sum: { amount: true },
      _count: true,
    });

    // 5. 정산 현황
    const pendingSettlements = await prisma.projectInfluencer.findMany({
      where: { paymentStatus: { in: ["PENDING", "REQUESTED"] } },
      include: {
        Influencer: { select: { name: true } },
        Project: { select: { name: true, Client: { select: { name: true } } } },
      },
      orderBy: { paymentDueDate: "asc" },
    });

    const totalPendingSettlement = pendingSettlements.reduce((sum, s) => sum + s.fee, 0);

    // 이번 주 마감인 정산
    const settlementsDueThisWeek = pendingSettlements.filter(
      (s) => s.paymentDueDate && s.paymentDueDate >= thisWeek.start && s.paymentDueDate <= thisWeek.end
    );

    // 6. 프로젝트 현황
    const activeProjects = await prisma.project.count({ where: { status: "IN_PROGRESS" } });
    const quotingProjects = await prisma.project.count({ where: { status: "QUOTING" } });

    // 이번 주 완료된 프로젝트
    const completedThisWeek = await prisma.project.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: thisWeek.start, lte: thisWeek.end },
      },
      include: { Client: { select: { name: true } } },
    });

    // 다음 주 마감 예정 프로젝트
    const projectsEndingNextWeek = await prisma.project.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "QUOTING"] },
        endDate: { gte: nextWeek.start, lte: nextWeek.end },
      },
      include: { Client: { select: { name: true } } },
    });

    // 7. 세금계산서 미발행 프로젝트
    const projectsWithoutTaxInvoice = await prisma.project.findMany({
      where: {
        status: "COMPLETED",
        Document: { none: { type: "TAX_INVOICE" } },
      },
      include: { Client: { select: { name: true } } },
    });

    // 8. 이번 주 협업 인플루언서
    const influencersThisWeek = await prisma.projectInfluencer.findMany({
      where: { createdAt: { gte: thisWeek.start, lte: thisWeek.end } },
      include: { Influencer: { select: { name: true } } },
      distinct: ["influencerId"],
    });

    // ========== 리포트 메시지 생성 ==========
    const weekLabel = `${thisWeek.start.getMonth() + 1}/${thisWeek.start.getDate()} ~ ${thisWeek.end.getMonth() + 1}/${thisWeek.end.getDate()}`;

    let message = `📊 *주간 현황 리포트*\n`;
    message += `📅 ${thisWeek.start.getFullYear()}년 ${weekLabel}\n`;
    message += `${"━".repeat(28)}\n\n`;

    // 💰 재무 요약
    message += `💰 *이번 주 재무 요약*\n`;
    message += `┌─────────────────────────┐\n`;
    message += `│ 매출: ${formatAmount(thisWeekRevenue).padEnd(12)} ${getChangeEmoji(thisWeekRevenue, lastWeekRevenue)} ${getChangePercent(thisWeekRevenue, lastWeekRevenue)}\n`;
    message += `│ 지출: ${formatAmount(thisWeekExpense).padEnd(12)} ${getChangeEmoji(thisWeekExpense, lastWeekExpense)} ${getChangePercent(thisWeekExpense, lastWeekExpense)}\n`;
    message += `│ 순이익: ${formatAmount(thisWeekProfit)}\n`;
    message += `└─────────────────────────┘\n\n`;

    // 📉 지출 분석
    if (topExpenses.length > 0) {
      message += `📉 *지출 TOP 3*\n`;
      topExpenses.forEach((e, i) => {
        message += `${i + 1}. ${e.category}: ${formatAmount(e.amount)} (${e.percent}%)\n`;
      });
      message += `\n`;
    }

    // 🏆 클라이언트별 매출
    if (topClients.length > 0) {
      message += `🏆 *클라이언트별 매출 TOP 3*\n`;
      topClients.forEach((c, i) => {
        message += `${i + 1}. ${c.name}: ${formatAmount(c.amount)}\n`;
      });
      message += `\n`;
    }

    // ⚠️ 미결 현황
    message += `⚠️ *미결 현황*\n`;
    message += `• 미수금: ${formatAmount(unpaidRevenue._sum.amount || 0)} (${unpaidRevenue._count}건)\n`;
    message += `• 정산 대기: ${formatAmount(totalPendingSettlement)} (${pendingSettlements.length}건)\n`;
    if (settlementsDueThisWeek.length > 0) {
      message += `• 🔴 이번 주 정산 마감: ${settlementsDueThisWeek.length}건\n`;
    }
    message += `\n`;

    // 📁 프로젝트 현황
    message += `📁 *프로젝트 현황*\n`;
    message += `• 진행 중: ${activeProjects}건 | 견적 중: ${quotingProjects}건\n`;

    if (completedThisWeek.length > 0) {
      message += `\n✅ *이번 주 완료* (${completedThisWeek.length}건)\n`;
      completedThisWeek.slice(0, 3).forEach((p) => {
        message += `• ${p.Client.name} - ${p.name}\n`;
      });
      if (completedThisWeek.length > 3) {
        message += `  _...외 ${completedThisWeek.length - 3}건_\n`;
      }
    }

    if (projectsEndingNextWeek.length > 0) {
      message += `\n⏰ *다음 주 마감 예정* (${projectsEndingNextWeek.length}건)\n`;
      projectsEndingNextWeek.forEach((p) => {
        const endDate = new Date(p.endDate);
        message += `• ${p.Client.name} - ${p.name} (${endDate.getMonth() + 1}/${endDate.getDate()})\n`;
      });
    }

    // 📄 세금계산서 미발행
    if (projectsWithoutTaxInvoice.length > 0) {
      message += `\n📄 *세금계산서 미발행* (${projectsWithoutTaxInvoice.length}건)\n`;
      projectsWithoutTaxInvoice.slice(0, 3).forEach((p) => {
        message += `• ${p.Client.name} - ${p.name} (${formatAmount(p.contractAmount)})\n`;
      });
      if (projectsWithoutTaxInvoice.length > 3) {
        message += `  _...외 ${projectsWithoutTaxInvoice.length - 3}건_\n`;
      }
    }

    // 💸 이번 주 정산 마감
    if (settlementsDueThisWeek.length > 0) {
      message += `\n💸 *이번 주 정산 마감*\n`;
      settlementsDueThisWeek.slice(0, 5).forEach((s) => {
        const dueDate = s.paymentDueDate
          ? `${s.paymentDueDate.getMonth() + 1}/${s.paymentDueDate.getDate()}`
          : "";
        message += `• ${s.Influencer.name} - ${formatAmount(s.fee)} (${dueDate})\n`;
      });
      if (settlementsDueThisWeek.length > 5) {
        message += `  _...외 ${settlementsDueThisWeek.length - 5}건_\n`;
      }
    }

    // 👤 이번 주 협업 인플루언서
    if (influencersThisWeek.length > 0) {
      message += `\n👤 *이번 주 신규 협업*: ${influencersThisWeek.length}명\n`;
      const names = influencersThisWeek.slice(0, 5).map((i) => i.Influencer.name);
      message += `• ${names.join(", ")}${influencersThisWeek.length > 5 ? ` 외 ${influencersThisWeek.length - 5}명` : ""}\n`;
    }

    message += `\n${"━".repeat(28)}\n`;
    message += `_매주 월요일 오전 9시 자동 발송_`;

    // Slack으로 전송
    if (SLACK_CHANNEL_ID) {
      await sendSlackMessage(SLACK_CHANNEL_ID, message);
    }

    return NextResponse.json({
      success: true,
      message: "주간 리포트 발송 완료",
      data: {
        period: weekLabel,
        revenue: thisWeekRevenue,
        expense: thisWeekExpense,
        profit: thisWeekProfit,
        unpaidAmount: unpaidRevenue._sum.amount || 0,
        pendingSettlements: pendingSettlements.length,
        activeProjects,
        quotingProjects,
        completedThisWeek: completedThisWeek.length,
        projectsEndingNextWeek: projectsEndingNextWeek.length,
        taxInvoicePending: projectsWithoutTaxInvoice.length,
      },
    });
  } catch (error) {
    console.error("주간 리포트 생성 오류:", error);
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
