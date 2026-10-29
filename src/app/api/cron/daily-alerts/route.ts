import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackMessage } from "@/lib/slack";

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;

// Cron 인증 (Vercel Cron 또는 외부 스케줄러)
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron은 CRON_SECRET 헤더로 인증
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // 개발 환경에서는 인증 생략
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}

// 금액 포맷팅 (만원 단위)
function formatAmountShort(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1).replace(/\.0$/, "") + "만원";
  }
  return amount.toLocaleString("ko-KR") + "원";
}

// 날짜 차이 계산 (일 단위)
function getDaysDiff(targetDate: Date, today: Date): number {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 금액 포맷팅
function formatAmount(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

// 정산 알림 메시지 생성
interface SettlementAlert {
  influencerName: string;
  projectName: string;
  clientName: string;
  fee: number;
  dueDate: Date;
  daysDiff: number;
}

function formatSettlementAlerts(alerts: SettlementAlert[], type: string): string {
  const emoji = {
    "D-7": "⏰",
    "D-3": "⚠️",
    "D-Day": "🔴",
    "overdue": "❌",
  }[type] || "📋";

  const title = {
    "D-7": "7일 후 정산 마감 예정",
    "D-3": "3일 후 정산 마감 - 빠른 처리 필요",
    "D-Day": "오늘 정산 마감",
    "overdue": "정산 지연 - 즉시 처리 필요",
  }[type] || "정산 알림";

  let message = `${emoji} *${title}*\n\n`;

  alerts.forEach((alert, index) => {
    message += `${index + 1}. *${alert.influencerName}*\n`;
    message += `   • 프로젝트: ${alert.projectName} (${alert.clientName})\n`;
    message += `   • 정산금액: ${formatAmount(alert.fee)}\n`;
    message += `   • 마감일: ${alert.dueDate.toLocaleDateString("ko-KR")}\n\n`;
  });

  return message;
}

// 미수금 알림 생성
interface UnpaidAlert {
  clientName: string;
  projectName: string;
  amount: number;
  daysSinceEnd: number;
}

function formatUnpaidAlerts(alerts: UnpaidAlert[]): string {
  if (alerts.length === 0) return "";

  let message = `💰 *미수금 알림* (프로젝트 종료 후 30일 이상)\n\n`;

  alerts.forEach((alert, index) => {
    message += `${index + 1}. *${alert.clientName}* - ${alert.projectName}\n`;
    message += `   • 미수금: ${formatAmount(alert.amount)}\n`;
    message += `   • 종료 후 ${alert.daysSinceEnd}일 경과\n\n`;
  });

  return message;
}

// 세금계산서 미발행 알림
interface TaxInvoiceAlert {
  clientName: string;
  projectName: string;
  amount: number;
  completedDate: Date;
}

function formatTaxInvoiceAlerts(alerts: TaxInvoiceAlert[]): string {
  if (alerts.length === 0) return "";

  let message = `📄 *세금계산서 미발행 알림*\n\n`;

  alerts.forEach((alert, index) => {
    message += `${index + 1}. *${alert.clientName}* - ${alert.projectName}\n`;
    message += `   • 금액: ${formatAmount(alert.amount)}\n`;
    message += `   • 완료일: ${alert.completedDate.toLocaleDateString("ko-KR")}\n\n`;
  });

  return message;
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const alerts: string[] = [];

    // 0. Slack 중복 방지 기록 정리 (재전송은 수 분 안에 오므로 7일이면 충분)
    try {
      const slackEventCutoff = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      await prisma.slackEvent.deleteMany({ where: { createdAt: { lt: slackEventCutoff } } });
    } catch (error) {
      console.error("SlackEvent cleanup failed:", error);
    }

    // 1. 정산 마감 알림 조회
    const pendingSettlements = await prisma.projectInfluencer.findMany({
      where: {
        paymentStatus: { in: ["PENDING", "REQUESTED"] },
        paymentDueDate: { not: null },
      },
      include: {
        Influencer: { select: { name: true } },
        Project: {
          select: {
            name: true,
            Client: { select: { name: true } }
          }
        },
      },
    });

    // 정산 알림 분류
    const d7Alerts: SettlementAlert[] = [];
    const d3Alerts: SettlementAlert[] = [];
    const dDayAlerts: SettlementAlert[] = [];
    const overdueAlerts: SettlementAlert[] = [];

    pendingSettlements.forEach((settlement) => {
      if (!settlement.paymentDueDate) return;

      const daysDiff = getDaysDiff(settlement.paymentDueDate, today);
      const alert: SettlementAlert = {
        influencerName: settlement.Influencer.name,
        projectName: settlement.Project.name,
        clientName: settlement.Project.Client.name,
        fee: settlement.fee,
        dueDate: settlement.paymentDueDate,
        daysDiff,
      };

      if (daysDiff === 7) {
        d7Alerts.push(alert);
      } else if (daysDiff === 3) {
        d3Alerts.push(alert);
      } else if (daysDiff === 0) {
        dDayAlerts.push(alert);
      } else if (daysDiff < 0) {
        overdueAlerts.push(alert);
      }
    });

    // 정산 알림 메시지 추가
    if (d7Alerts.length > 0) {
      alerts.push(formatSettlementAlerts(d7Alerts, "D-7"));
    }
    if (d3Alerts.length > 0) {
      alerts.push(formatSettlementAlerts(d3Alerts, "D-3"));
    }
    if (dDayAlerts.length > 0) {
      alerts.push(formatSettlementAlerts(dDayAlerts, "D-Day"));
    }
    if (overdueAlerts.length > 0) {
      alerts.push(formatSettlementAlerts(overdueAlerts, "overdue"));
    }

    // 2. 미수금 알림 (완료된 프로젝트 중 30일 이상 경과)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const unpaidProjects = await prisma.project.findMany({
      where: {
        status: "COMPLETED",
        endDate: { lte: thirtyDaysAgo },
      },
      include: {
        Client: { select: { name: true } },
        Transaction: {
          where: { type: "REVENUE" },
          select: { amount: true, paymentStatus: true },
        },
      },
    });

    const unpaidAlerts: UnpaidAlert[] = [];
    unpaidProjects.forEach((project) => {
      const unpaidRevenue = project.Transaction
        .filter((t) => t.paymentStatus !== "COMPLETED")
        .reduce((sum, t) => sum + t.amount, 0);

      if (unpaidRevenue > 0) {
        const daysSinceEnd = getDaysDiff(today, project.endDate);
        unpaidAlerts.push({
          clientName: project.Client.name,
          projectName: project.name,
          amount: unpaidRevenue,
          daysSinceEnd: Math.abs(daysSinceEnd),
        });
      }
    });

    if (unpaidAlerts.length > 0) {
      alerts.push(formatUnpaidAlerts(unpaidAlerts));
    }

    // 3. 세금계산서 미발행 알림 (완료 후 7일 경과)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completedProjectsWithoutTax = await prisma.project.findMany({
      where: {
        status: "COMPLETED",
        endDate: { lte: sevenDaysAgo },
        Document: {
          none: { type: "TAX_INVOICE" },
        },
      },
      include: {
        Client: { select: { name: true } },
      },
    });

    const taxInvoiceAlerts: TaxInvoiceAlert[] = completedProjectsWithoutTax.map((project) => ({
      clientName: project.Client.name,
      projectName: project.name,
      amount: project.contractAmount,
      completedDate: project.endDate,
    }));

    if (taxInvoiceAlerts.length > 0) {
      alerts.push(formatTaxInvoiceAlerts(taxInvoiceAlerts));
    }

    // 4. 오늘의 일정 브리핑 (Daily Briefing)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayMeetings = await prisma.calendarEvent.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { date: "asc" },
    });

    const todayProjectDeadlines = await prisma.project.findMany({
      where: {
        endDate: { gte: todayStart, lte: todayEnd },
        status: { in: ["IN_PROGRESS", "QUOTING"] },
      },
      include: { Client: { select: { name: true } } },
    });

    // 진행 중인 프로젝트
    const activeProjects = await prisma.project.count({
      where: { status: "IN_PROGRESS" },
    });

    // 이번주 마감 예정 프로젝트
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + (7 - today.getDay()));
    const thisWeekDeadlines = await prisma.project.count({
      where: {
        endDate: { gte: todayStart, lte: weekEnd },
        status: "IN_PROGRESS",
      },
    });

    // Daily Briefing 메시지
    let briefingMessage = `☀️ *오늘의 브리핑* (${today.toLocaleDateString("ko-KR", { weekday: "long", month: "long", day: "numeric" })})\n\n`;

    // 오늘 일정
    if (todayMeetings.length > 0 || todayProjectDeadlines.length > 0) {
      briefingMessage += `📅 *오늘 일정*\n`;
      todayMeetings.forEach((m) => {
        const typeEmoji = m.type === "MEETING" ? "🤝" : m.type === "DEADLINE" ? "⏰" : "📌";
        briefingMessage += `${typeEmoji} ${m.title}\n`;
      });
      todayProjectDeadlines.forEach((p) => {
        briefingMessage += `📁 [마감] ${p.name} (${p.Client.name})\n`;
      });
      briefingMessage += `\n`;
    } else {
      briefingMessage += `📅 오늘 예정된 일정이 없습니다.\n\n`;
    }

    // 현황 요약
    briefingMessage += `📊 *현황 요약*\n`;
    briefingMessage += `• 진행 중 프로젝트: ${activeProjects}건\n`;
    briefingMessage += `• 이번주 마감 예정: ${thisWeekDeadlines}건\n`;
    briefingMessage += `• 정산 대기: ${pendingSettlements.length}건\n\n`;

    // 5. 이상 징후 감지 (Anomaly Detection)
    const anomalies: string[] = [];

    // 이번달 vs 지난달 지출 비교
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    const thisMonthExpense = await prisma.transaction.aggregate({
      where: {
        type: "EXPENSE",
        date: { gte: thisMonthStart, lte: todayEnd },
      },
      _sum: { amount: true },
    });

    const lastMonthExpense = await prisma.transaction.aggregate({
      where: {
        type: "EXPENSE",
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    });

    const thisMonthExpenseAmount = thisMonthExpense._sum.amount || 0;
    const lastMonthExpenseAmount = lastMonthExpense._sum.amount || 0;

    // 지출이 지난달 대비 50% 이상 증가
    if (lastMonthExpenseAmount > 0) {
      const expenseChangePercent = ((thisMonthExpenseAmount - lastMonthExpenseAmount) / lastMonthExpenseAmount) * 100;
      if (expenseChangePercent > 50) {
        anomalies.push(
          `📈 *지출 급증 알림*\n` +
          `이번달 지출이 지난달 대비 ${expenseChangePercent.toFixed(0)}% 증가했습니다.\n` +
          `• 이번달: ${formatAmountShort(thisMonthExpenseAmount)}\n` +
          `• 지난달: ${formatAmountShort(lastMonthExpenseAmount)}`
        );
      }
    }

    // 매출이 지난달 대비 30% 이상 감소
    const thisMonthRevenue = await prisma.transaction.aggregate({
      where: {
        type: "REVENUE",
        date: { gte: thisMonthStart, lte: todayEnd },
      },
      _sum: { amount: true },
    });

    const lastMonthRevenue = await prisma.transaction.aggregate({
      where: {
        type: "REVENUE",
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    });

    const thisMonthRevenueAmount = thisMonthRevenue._sum.amount || 0;
    const lastMonthRevenueAmount = lastMonthRevenue._sum.amount || 0;

    if (lastMonthRevenueAmount > 0) {
      const revenueChangePercent = ((thisMonthRevenueAmount - lastMonthRevenueAmount) / lastMonthRevenueAmount) * 100;
      if (revenueChangePercent < -30) {
        anomalies.push(
          `📉 *매출 감소 알림*\n` +
          `이번달 매출이 지난달 대비 ${Math.abs(revenueChangePercent).toFixed(0)}% 감소했습니다.\n` +
          `• 이번달: ${formatAmountShort(thisMonthRevenueAmount)}\n` +
          `• 지난달: ${formatAmountShort(lastMonthRevenueAmount)}`
        );
      }
    }

    // 연체된 정산이 5건 이상
    if (overdueAlerts.length >= 5) {
      anomalies.push(
        `⚠️ *정산 연체 경고*\n` +
        `연체된 정산이 ${overdueAlerts.length}건 있습니다. 즉시 처리가 필요합니다.`
      );
    }

    // 6. 스마트 리마인더 (오늘/내일 미팅 알림)
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(today.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tomorrowMeetings = await prisma.calendarEvent.findMany({
      where: {
        date: { gte: tomorrowStart, lte: tomorrowEnd },
        type: "MEETING",
      },
    });

    let reminderMessage = "";
    if (tomorrowMeetings.length > 0) {
      reminderMessage = `\n🔔 *내일 미팅 알림*\n`;
      tomorrowMeetings.forEach((m) => {
        reminderMessage += `• ${m.title}\n`;
      });
    }

    // Slack으로 알림 전송
    if (SLACK_CHANNEL_ID) {
      // 1. 브리핑 전송 (매일)
      await sendSlackMessage(SLACK_CHANNEL_ID, briefingMessage + reminderMessage);

      // 2. 정산/미수금 알림 전송 (있는 경우만)
      if (alerts.length > 0) {
        const alertHeader = `🚨 *알림 사항*\n${"─".repeat(30)}\n\n`;
        const alertMessage = alertHeader + alerts.join("\n" + "─".repeat(30) + "\n\n");
        await sendSlackMessage(SLACK_CHANNEL_ID, alertMessage);
      }

      // 3. 이상 징후 알림 (있는 경우만)
      if (anomalies.length > 0) {
        const anomalyHeader = `🔍 *이상 징후 감지*\n${"─".repeat(30)}\n\n`;
        const anomalyMessage = anomalyHeader + anomalies.join("\n\n");
        await sendSlackMessage(SLACK_CHANNEL_ID, anomalyMessage);
      }
    }

    return NextResponse.json({
      success: true,
      message: "일일 알림 처리 완료",
      summary: {
        briefing: {
          todayMeetings: todayMeetings.length,
          todayDeadlines: todayProjectDeadlines.length,
          activeProjects,
          thisWeekDeadlines,
        },
        alerts: {
          settlementD7: d7Alerts.length,
          settlementD3: d3Alerts.length,
          settlementDDay: dDayAlerts.length,
          settlementOverdue: overdueAlerts.length,
          unpaid: unpaidAlerts.length,
          taxInvoicePending: taxInvoiceAlerts.length,
        },
        anomalies: anomalies.length,
        reminders: {
          tomorrowMeetings: tomorrowMeetings.length,
        },
      },
      sentToSlack: true,
    });
  } catch (error) {
    console.error("일일 알림 처리 오류:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - 수동 테스트용
export async function GET(request: NextRequest) {
  // POST와 동일한 로직 실행 (테스트 편의성)
  return POST(request);
}
