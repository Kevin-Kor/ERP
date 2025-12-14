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

// 이번 주 시작/끝 날짜 계산 (월요일 시작)
function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정

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

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const thisWeek = getWeekRange(today);
    const lastWeek = getLastWeekRange(today);

    // 1. 이번 주 매출/지출 조회
    const thisWeekTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: thisWeek.start, lte: thisWeek.end },
      },
    });

    const lastWeekTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: lastWeek.start, lte: lastWeek.end },
      },
    });

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

    // 2. 미수금 현황
    const unpaidRevenue = await prisma.transaction.aggregate({
      where: {
        type: "REVENUE",
        paymentStatus: { not: "COMPLETED" },
      },
      _sum: { amount: true },
      _count: true,
    });

    // 3. 정산 대기 현황
    const pendingSettlements = await prisma.projectInfluencer.findMany({
      where: {
        paymentStatus: { in: ["PENDING", "REQUESTED"] },
      },
      include: {
        Influencer: { select: { name: true } },
        Project: { select: { name: true } },
      },
    });

    const totalPendingSettlement = pendingSettlements.reduce((sum, s) => sum + s.fee, 0);

    // 4. 이번 주 마감 프로젝트
    const projectsEndingThisWeek = await prisma.project.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "QUOTING"] },
        endDate: { gte: thisWeek.start, lte: thisWeek.end },
      },
      include: {
        Client: { select: { name: true } },
      },
    });

    // 5. 진행 중인 프로젝트 현황
    const activeProjects = await prisma.project.count({
      where: { status: "IN_PROGRESS" },
    });

    const quotingProjects = await prisma.project.count({
      where: { status: "QUOTING" },
    });

    // 6. 세금계산서 미발행 프로젝트
    const projectsWithoutTaxInvoice = await prisma.project.findMany({
      where: {
        status: "COMPLETED",
        Document: {
          none: { type: "TAX_INVOICE" },
        },
      },
      include: {
        Client: { select: { name: true } },
      },
      take: 5,
    });

    // 리포트 메시지 생성
    const weekLabel = `${thisWeek.start.getMonth() + 1}/${thisWeek.start.getDate()} ~ ${thisWeek.end.getMonth() + 1}/${thisWeek.end.getDate()}`;

    let message = `📊 *주간 현황 리포트*\n`;
    message += `📅 ${weekLabel}\n`;
    message += `${"━".repeat(25)}\n\n`;

    // 재무 요약
    message += `💰 *재무 요약*\n`;
    message += `• 매출: ${formatAmount(thisWeekRevenue)} (${getChangePercent(thisWeekRevenue, lastWeekRevenue)})\n`;
    message += `• 지출: ${formatAmount(thisWeekExpense)} (${getChangePercent(thisWeekExpense, lastWeekExpense)})\n`;
    message += `• 순이익: ${formatAmount(thisWeekProfit)}\n\n`;

    // 미수금 현황
    message += `📋 *미결 현황*\n`;
    message += `• 미수금: ${formatAmount(unpaidRevenue._sum.amount || 0)} (${unpaidRevenue._count}건)\n`;
    message += `• 정산 대기: ${formatAmount(totalPendingSettlement)} (${pendingSettlements.length}건)\n\n`;

    // 프로젝트 현황
    message += `📁 *프로젝트*\n`;
    message += `• 진행 중: ${activeProjects}건\n`;
    message += `• 견적 중: ${quotingProjects}건\n`;

    if (projectsEndingThisWeek.length > 0) {
      message += `\n⏰ *이번 주 마감 예정*\n`;
      projectsEndingThisWeek.forEach((p) => {
        const endDate = new Date(p.endDate);
        message += `• ${p.Client.name} - ${p.name} (${endDate.getMonth() + 1}/${endDate.getDate()})\n`;
      });
    }

    // 세금계산서 미발행
    if (projectsWithoutTaxInvoice.length > 0) {
      message += `\n📄 *세금계산서 미발행*\n`;
      projectsWithoutTaxInvoice.forEach((p) => {
        message += `• ${p.Client.name} - ${p.name} (${formatAmount(p.contractAmount)})\n`;
      });
      if (projectsWithoutTaxInvoice.length >= 5) {
        message += `• ... 외 더 있음\n`;
      }
    }

    // 정산 대기 상세 (상위 5건)
    if (pendingSettlements.length > 0) {
      message += `\n💸 *정산 대기 상세* (상위 5건)\n`;
      const sortedSettlements = pendingSettlements
        .sort((a, b) => {
          if (!a.paymentDueDate) return 1;
          if (!b.paymentDueDate) return -1;
          return a.paymentDueDate.getTime() - b.paymentDueDate.getTime();
        })
        .slice(0, 5);

      sortedSettlements.forEach((s) => {
        const dueDate = s.paymentDueDate
          ? `${s.paymentDueDate.getMonth() + 1}/${s.paymentDueDate.getDate()}`
          : "미정";
        message += `• ${s.Influencer.name} - ${formatAmount(s.fee)} (마감: ${dueDate})\n`;
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
        projectsEndingThisWeek: projectsEndingThisWeek.length,
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
