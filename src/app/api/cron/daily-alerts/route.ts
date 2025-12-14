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

    // Slack으로 알림 전송
    if (alerts.length > 0 && SLACK_CHANNEL_ID) {
      const header = `📊 *일일 자동 알림* (${today.toLocaleDateString("ko-KR")})\n${"─".repeat(30)}\n\n`;
      const fullMessage = header + alerts.join("\n" + "─".repeat(30) + "\n\n");

      await sendSlackMessage(SLACK_CHANNEL_ID, fullMessage);
    }

    return NextResponse.json({
      success: true,
      message: "일일 알림 처리 완료",
      summary: {
        settlementD7: d7Alerts.length,
        settlementD3: d3Alerts.length,
        settlementDDay: dDayAlerts.length,
        settlementOverdue: overdueAlerts.length,
        unpaid: unpaidAlerts.length,
        taxInvoicePending: taxInvoiceAlerts.length,
      },
      sentToSlack: alerts.length > 0,
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
