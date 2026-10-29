import { after, NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifySlackRequest, sendSlackMessage, formatSuccessMessage, formatErrorMessage } from "@/lib/slack";
import { parseNaturalLanguage, type ParsedResult } from "@/lib/ai-parser";
import { prisma } from "@/lib/prisma";

// 응답 후(after) 실행되는 AI 파싱·DB 처리·답장 전송까지 포함한 최대 실행 시간
export const maxDuration = 60;

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;

// 대화 맥락 저장 (follow_up 기능용)
interface ConversationContext {
  lastIntent: string;
  lastData: Record<string, unknown>;
  lastResult: Record<string, unknown>;
  timestamp: number;
}
const conversationContexts = new Map<string, ConversationContext>();
const CONTEXT_TTL = 300000; // 5분

// 같은 이벤트를 두 번 처리하지 않도록 event_id를 DB에 먼저 기록한다.
// Slack은 3초 안에 응답이 없거나 실패하면 같은 이벤트를 재전송하고,
// 서버리스 인스턴스끼리는 메모리를 공유하지 않으므로 메모리 캐시로는 막을 수 없다.
// 처음 기록에 성공한 요청만 true를 받는다.
async function claimSlackEvent(eventId: string): Promise<boolean> {
  try {
    await prisma.slackEvent.create({ data: { id: eventId } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}

// 기본 사용자 ID 가져오기
async function getDefaultUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { email: process.env.DEFAULT_USER_EMAIL || "admin@agency.com" },
  });
  return user?.id || null;
}

// 인텐트별 처리 함수
async function handleIntent(parsed: ParsedResult, userId: string | null) {
  const { intent, data } = parsed;

  switch (intent) {
    case "add_transaction":
      return await handleAddTransaction(data);
    case "add_calendar":
      return await handleAddCalendar(data, userId);
    case "add_influencer":
      return await handleAddInfluencer(data);
    case "add_client":
      return await handleAddClient(data);
    case "query_dashboard":
      return await handleQueryDashboard();
    case "query_client":
      return await handleQueryClient(data);
    case "query_project":
      return await handleQueryProject(data);
    case "query_settlement":
      return await handleQuerySettlement(data);
    case "query_spending":
      return await handleQuerySpending(data);
    case "query_influencer":
      return await handleQueryInfluencer(data);
    case "query_schedule":
      return await handleQuerySchedule(data);
    case "query_todo":
      return await handleQueryTodo(data);
    case "update_status":
      return await handleUpdateStatus(data);
    case "smart_search":
      return await handleSmartSearch(data);
    case "follow_up":
      return await handleFollowUp(data, SLACK_CHANNEL_ID);
    case "generate_report":
      return await handleGenerateReport(data);
    default:
      return {
        success: false,
        message: "이해하지 못한 요청입니다. 다시 시도해주세요.\n\n지원 명령어:\n" +
          "📝 *등록*\n" +
          "- 지출/수입: \"15000원 커피 지출\"\n" +
          "- 일정: \"15일 미팅 일정\"\n" +
          "- 인플루언서: \"인플루언서 OOO 추가\"\n\n" +
          "🔍 *조회*\n" +
          "- 전체 현황: \"이번 달 현황\"\n" +
          "- 클라이언트: \"ABC 회사 정산 현황\"\n" +
          "- 프로젝트: \"진행중인 프로젝트\"\n" +
          "- 정산: \"정산 대기 목록\"\n" +
          "- 지출: \"이번달 지출 분석\"\n" +
          "- 일정: \"이번주 마감 일정\"\n\n" +
          "✏️ *업데이트*\n" +
          "- \"ABC 프로젝트 완료 처리해줘\"\n\n" +
          "🔎 *검색*\n" +
          "- \"뷰티 캠페인 찾아줘\"\n\n" +
          "📊 *리포트*\n" +
          "- \"주간 리포트 보내줘\"",
      };
  }
}

// 거래 추가
async function handleAddTransaction(data: Record<string, unknown>) {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(data.date as string),
        type: data.type as string,
        category: data.category as string,
        amount: Number(data.amount),
        memo: (data.memo as string) || null,
        paymentStatus: "COMPLETED",
      },
    });

    return {
      success: true,
      intent: "add_transaction",
      data: {
        ...data,
        id: transaction.id,
      },
    };
  } catch (error) {
    console.error("거래 추가 오류:", error);
    return { success: false, message: "거래 등록에 실패했습니다." };
  }
}

// 캘린더 이벤트 추가
async function handleAddCalendar(data: Record<string, unknown>, userId: string | null) {
  try {
    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title as string,
        date: new Date(data.date as string),
        type: (data.type as string) || "OTHER",
        memo: (data.memo as string) || null,
        color: getEventColor(data.type as string),
        userId: userId,
      },
    });

    const typeLabels: Record<string, string> = {
      MEETING: "미팅",
      DEADLINE: "마감",
      PAYMENT: "정산/입금",
      OTHER: "기타",
    };

    return {
      success: true,
      intent: "add_calendar",
      data: {
        ...data,
        id: event.id,
        typeLabel: typeLabels[data.type as string] || "기타",
      },
    };
  } catch (error) {
    console.error("캘린더 추가 오류:", error);
    return { success: false, message: "일정 등록에 실패했습니다." };
  }
}

// 이벤트 색상 설정
function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    MEETING: "#3B82F6",
    DEADLINE: "#EF4444",
    PAYMENT: "#10B981",
    OTHER: "#6B7280",
  };
  return colors[type] || colors.OTHER;
}

// 인플루언서 추가
async function handleAddInfluencer(data: Record<string, unknown>) {
  try {
    const influencer = await prisma.influencer.create({
      data: {
        name: data.name as string,
        phone: (data.phone as string) || "",
        instagramId: (data.instagramId as string) || null,
        youtubeChannel: (data.youtubeChannel as string) || null,
        categories: data.categories ? JSON.stringify(data.categories) : null,
        bankAccount: (data.bankAccount as string) || null,
        priceRange: (data.priceRange as string) || null,
        memo: (data.memo as string) || null,
      },
    });

    return {
      success: true,
      intent: "add_influencer",
      data: {
        ...data,
        id: influencer.id,
      },
    };
  } catch (error) {
    console.error("인플루언서 추가 오류:", error);
    return { success: false, message: "인플루언서 등록에 실패했습니다." };
  }
}

// 클라이언트 추가
async function handleAddClient(data: Record<string, unknown>) {
  try {
    const client = await prisma.client.create({
      data: {
        name: data.name as string,
        contactName: (data.contactName as string) || "담당자 미정",
        phone: (data.phone as string) || "",
        industry: (data.industry as string) || null,
        memo: (data.memo as string) || null,
      },
    });

    return {
      success: true,
      intent: "add_client",
      data: {
        ...data,
        id: client.id,
      },
    };
  } catch (error) {
    console.error("클라이언트 추가 오류:", error);
    return { success: false, message: "클라이언트 등록에 실패했습니다." };
  }
}

// 대시보드 조회
async function handleQueryDashboard() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const revenue = transactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
    const profit = revenue - expense;

    return {
      success: true,
      intent: "query_dashboard",
      data: {
        revenue,
        expense,
        profit,
        period: "this_month",
      },
    };
  } catch (error) {
    console.error("대시보드 조회 오류:", error);
    return { success: false, message: "대시보드 조회에 실패했습니다." };
  }
}

// 금액 포맷팅 헬퍼
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1).replace(/\.0$/, "") + "만원";
  }
  return amount.toLocaleString("ko-KR") + "원";
}

// 클라이언트 조회
async function handleQueryClient(data: Record<string, unknown>) {
  try {
    const searchTerm = data.searchTerm as string;

    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { contactName: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
            status: true,
            contractAmount: true,
            ProjectInfluencer: {
              select: {
                fee: true,
                paymentStatus: true,
              },
            },
          },
        },
        Transaction: {
          where: { type: "REVENUE" },
          select: { amount: true, paymentStatus: true },
        },
      },
      take: 5,
    });

    if (clients.length === 0) {
      return {
        success: true,
        intent: "query_client",
        data: { found: false, searchTerm },
      };
    }

    const results = clients.map((client) => {
      const totalRevenue = client.Transaction.reduce((sum, t) => sum + t.amount, 0);
      const unpaidRevenue = client.Transaction
        .filter((t) => t.paymentStatus !== "COMPLETED")
        .reduce((sum, t) => sum + t.amount, 0);
      const activeProjects = client.Project.filter((p) => p.status === "IN_PROGRESS").length;
      const pendingSettlements = client.Project.flatMap((p) => p.ProjectInfluencer)
        .filter((pi) => pi.paymentStatus === "PENDING" || pi.paymentStatus === "REQUESTED");
      const pendingSettlementAmount = pendingSettlements.reduce((sum, pi) => sum + pi.fee, 0);

      return {
        name: client.name,
        contactName: client.contactName,
        status: client.status,
        totalRevenue,
        unpaidRevenue,
        activeProjects,
        pendingSettlementAmount,
        pendingSettlementCount: pendingSettlements.length,
      };
    });

    return {
      success: true,
      intent: "query_client",
      data: { found: true, clients: results, searchTerm },
    };
  } catch (error) {
    console.error("클라이언트 조회 오류:", error);
    return { success: false, message: "클라이언트 조회에 실패했습니다." };
  }
}

// 프로젝트 조회
async function handleQueryProject(data: Record<string, unknown>) {
  try {
    const searchTerm = data.searchTerm as string | undefined;
    const status = data.status as string | undefined;

    const whereCondition: Record<string, unknown> = {};

    if (searchTerm) {
      whereCondition.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { Client: { name: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    if (status) {
      whereCondition.status = status;
    }

    const projects = await prisma.project.findMany({
      where: whereCondition,
      include: {
        Client: { select: { name: true } },
        ProjectInfluencer: {
          include: { Influencer: { select: { name: true } } },
        },
      },
      orderBy: { endDate: "asc" },
      take: 10,
    });

    if (projects.length === 0) {
      return {
        success: true,
        intent: "query_project",
        data: { found: false, searchTerm, status },
      };
    }

    const statusLabels: Record<string, string> = {
      QUOTING: "견적 중",
      IN_PROGRESS: "진행 중",
      COMPLETED: "완료",
      CANCELLED: "취소",
    };

    const results = projects.map((project) => ({
      name: project.name,
      clientName: project.Client.name,
      status: statusLabels[project.status] || project.status,
      contractAmount: project.contractAmount,
      startDate: project.startDate.toLocaleDateString("ko-KR"),
      endDate: project.endDate.toLocaleDateString("ko-KR"),
      influencerCount: project.ProjectInfluencer.length,
      influencers: project.ProjectInfluencer.map((pi) => pi.Influencer.name),
    }));

    return {
      success: true,
      intent: "query_project",
      data: { found: true, projects: results, count: projects.length },
    };
  } catch (error) {
    console.error("프로젝트 조회 오류:", error);
    return { success: false, message: "프로젝트 조회에 실패했습니다." };
  }
}

// 정산 현황 조회
async function handleQuerySettlement(data: Record<string, unknown>) {
  try {
    const searchTerm = data.searchTerm as string | undefined;
    const status = data.status as string | undefined;

    const whereCondition: Record<string, unknown> = {};

    if (searchTerm) {
      whereCondition.Influencer = {
        name: { contains: searchTerm, mode: "insensitive" },
      };
    }

    if (status === "PENDING") {
      whereCondition.paymentStatus = { in: ["PENDING", "REQUESTED"] };
    } else if (status === "COMPLETED") {
      whereCondition.paymentStatus = "COMPLETED";
    }

    const settlements = await prisma.projectInfluencer.findMany({
      where: whereCondition,
      include: {
        Influencer: { select: { name: true } },
        Project: {
          select: {
            name: true,
            Client: { select: { name: true } },
          },
        },
      },
      orderBy: { paymentDueDate: "asc" },
      take: 15,
    });

    const statusLabels: Record<string, string> = {
      PENDING: "대기",
      REQUESTED: "요청됨",
      COMPLETED: "완료",
    };

    const totalPending = settlements
      .filter((s) => s.paymentStatus === "PENDING" || s.paymentStatus === "REQUESTED")
      .reduce((sum, s) => sum + s.fee, 0);

    const results = settlements.map((s) => ({
      influencerName: s.Influencer.name,
      projectName: s.Project.name,
      clientName: s.Project.Client.name,
      fee: s.fee,
      status: statusLabels[s.paymentStatus] || s.paymentStatus,
      dueDate: s.paymentDueDate?.toLocaleDateString("ko-KR") || "미정",
    }));

    return {
      success: true,
      intent: "query_settlement",
      data: {
        found: settlements.length > 0,
        settlements: results,
        count: settlements.length,
        totalPending,
      },
    };
  } catch (error) {
    console.error("정산 조회 오류:", error);
    return { success: false, message: "정산 조회에 실패했습니다." };
  }
}

// 지출 분석 조회
async function handleQuerySpending(data: Record<string, unknown>) {
  try {
    const period = (data.period as string) || "this_month";
    const category = data.category as string | undefined;

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (period) {
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        periodLabel = "지난달";
        break;
      case "this_week":
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        periodLabel = "이번주";
        break;
      default: // this_month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        periodLabel = "이번달";
    }

    const whereCondition: Record<string, unknown> = {
      type: "EXPENSE",
      date: { gte: startDate, lte: endDate },
    };

    if (category) {
      whereCondition.category = category;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereCondition,
    });

    const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);

    // 카테고리별 집계
    const byCategory = transactions.reduce((acc, t) => {
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

    const categoryBreakdown = Object.entries(byCategory)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([cat, amount]: [string, number]) => ({
        category: categoryLabels[cat] || cat,
        amount,
        percent: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : "0",
      }));

    return {
      success: true,
      intent: "query_spending",
      data: {
        period: periodLabel,
        totalExpense,
        transactionCount: transactions.length,
        categoryBreakdown,
      },
    };
  } catch (error) {
    console.error("지출 분석 오류:", error);
    return { success: false, message: "지출 분석에 실패했습니다." };
  }
}

// 인플루언서 조회
async function handleQueryInfluencer(data: Record<string, unknown>) {
  try {
    const searchTerm = data.searchTerm as string;

    const influencers = await prisma.influencer.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { instagramId: { contains: searchTerm, mode: "insensitive" } },
          { categories: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        ProjectInfluencer: {
          include: {
            Project: {
              select: {
                name: true,
                status: true,
                Client: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      take: 5,
    });

    if (influencers.length === 0) {
      return {
        success: true,
        intent: "query_influencer",
        data: { found: false, searchTerm },
      };
    }

    const results = influencers.map((inf) => {
      const totalProjects = inf.ProjectInfluencer.length;
      const totalEarnings = inf.ProjectInfluencer.reduce((sum, pi) => sum + pi.fee, 0);
      const recentProjects = inf.ProjectInfluencer.slice(0, 3).map((pi) => ({
        projectName: pi.Project.name,
        clientName: pi.Project.Client.name,
        fee: pi.fee,
        status: pi.paymentStatus,
      }));

      return {
        name: inf.name,
        instagramId: inf.instagramId || "-",
        youtubeChannel: inf.youtubeChannel || "-",
        categories: inf.categories || "-",
        followerCount: inf.followerCount,
        priceRange: inf.priceRange || "-",
        totalProjects,
        totalEarnings,
        recentProjects,
      };
    });

    return {
      success: true,
      intent: "query_influencer",
      data: { found: true, influencers: results, searchTerm },
    };
  } catch (error) {
    console.error("인플루언서 조회 오류:", error);
    return { success: false, message: "인플루언서 조회에 실패했습니다." };
  }
}

// 일정/마감 조회
async function handleQuerySchedule(data: Record<string, unknown>) {
  try {
    const period = (data.period as string) || "this_week";
    const type = (data.type as string) || "all";

    const now = new Date();
    // KST 기준으로 날짜 계산
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (period) {
      case "today":
        startDate = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate());
        endDate = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate(), 23, 59, 59);
        periodLabel = "오늘";
        break;
      case "tomorrow":
        startDate = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate() + 1);
        endDate = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate() + 1, 23, 59, 59);
        periodLabel = "내일";
        break;
      case "next_week":
        const nextMonday = new Date(kstNow);
        nextMonday.setDate(kstNow.getDate() + (8 - kstNow.getDay()) % 7);
        startDate = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59);
        periodLabel = "다음주";
        break;
      case "this_month":
        startDate = new Date(kstNow.getFullYear(), kstNow.getMonth(), 1);
        endDate = new Date(kstNow.getFullYear(), kstNow.getMonth() + 1, 0, 23, 59, 59);
        periodLabel = "이번달";
        break;
      default: // this_week
        const day = kstNow.getDay();
        const diff = kstNow.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(kstNow.getFullYear(), kstNow.getMonth(), diff);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59);
        periodLabel = "이번주";
    }

    // 캘린더 이벤트 조회
    const calendarWhere: Record<string, unknown> = {
      date: { gte: startDate, lte: endDate },
    };
    if (type === "meeting") {
      calendarWhere.type = "MEETING";
    }

    const calendarEvents = await prisma.calendarEvent.findMany({
      where: calendarWhere,
      orderBy: { date: "asc" },
    });

    // 프로젝트 마감 조회 (deadline)
    const projects = type === "meeting" ? [] : await prisma.project.findMany({
      where: {
        endDate: { gte: startDate, lte: endDate },
        status: { in: ["IN_PROGRESS", "QUOTING"] },
      },
      include: {
        Client: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
    });

    // 정산 마감 조회
    const settlements = type === "meeting" ? [] : await prisma.projectInfluencer.findMany({
      where: {
        paymentDueDate: { gte: startDate, lte: endDate },
        paymentStatus: { in: ["PENDING", "REQUESTED"] },
      },
      include: {
        Influencer: { select: { name: true } },
        Project: { select: { name: true } },
      },
      orderBy: { paymentDueDate: "asc" },
    });

    const typeLabels: Record<string, string> = {
      MEETING: "미팅",
      DEADLINE: "마감",
      PAYMENT: "정산",
      OTHER: "기타",
    };

    const events = calendarEvents.map((e) => ({
      type: "calendar",
      title: e.title,
      date: e.date.toLocaleDateString("ko-KR"),
      category: typeLabels[e.type] || "기타",
    }));

    const deadlines = projects.map((p) => ({
      type: "project_deadline",
      title: `${p.name} (${p.Client.name})`,
      date: p.endDate.toLocaleDateString("ko-KR"),
      category: "프로젝트 마감",
    }));

    const settlementDueDates = settlements.map((s) => ({
      type: "settlement",
      title: `${s.Influencer.name} - ${s.Project.name}`,
      date: s.paymentDueDate?.toLocaleDateString("ko-KR") || "미정",
      category: "정산 마감",
      amount: s.fee,
    }));

    const allSchedules = [...events, ...deadlines, ...settlementDueDates].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return {
      success: true,
      intent: "query_schedule",
      data: {
        period: periodLabel,
        schedules: allSchedules,
        count: allSchedules.length,
        summary: {
          meetings: events.filter((e) => e.category === "미팅").length,
          projectDeadlines: deadlines.length,
          settlementDeadlines: settlementDueDates.length,
        },
      },
    };
  } catch (error) {
    console.error("일정 조회 오류:", error);
    return { success: false, message: "일정 조회에 실패했습니다." };
  }
}

// 팀 Todo 조회
async function handleQueryTodo(data: Record<string, unknown>) {
  try {
    const memberName = data.memberName as string | undefined;

    // 멤버 조회 (특정 멤버 지정 시)
    let memberId: string | undefined;
    let targetMemberName: string | undefined;

    if (memberName) {
      const member = await prisma.teamTodoMember.findFirst({
        where: {
          name: { contains: memberName, mode: "insensitive" },
        },
      });
      if (member) {
        memberId = member.id;
        targetMemberName = member.name;
      }
    }

    // 컬럼 조회 (순서대로)
    const columns = await prisma.teamTodoColumn.findMany({
      orderBy: { order: "asc" },
    });

    // 모든 멤버와 할일 조회
    const members = await prisma.teamTodoMember.findMany({
      where: memberId ? { id: memberId } : undefined,
      include: {
        tasks: {
          where: { completed: false },
          orderBy: { order: "asc" },
        },
      },
    });

    // 멤버별 할일 정리
    const todosByMember = members.map((member) => {
      const tasksByColumn = columns.map((col, idx) => ({
        columnName: col.name,
        tasks: member.tasks.filter((t) => t.columnIndex === idx),
      }));

      const pendingTasks = member.tasks.filter((t) => !t.completed);

      return {
        memberName: member.name,
        totalTasks: pendingTasks.length,
        tasksByColumn: tasksByColumn.filter((c) => c.tasks.length > 0),
      };
    });

    // 전체 미완료 할일 수
    const totalPendingTasks = todosByMember.reduce((sum, m) => sum + m.totalTasks, 0);

    return {
      success: true,
      intent: "query_todo",
      data: {
        found: totalPendingTasks > 0,
        targetMember: targetMemberName || null,
        totalPendingTasks,
        columns: columns.map((c) => c.name),
        todosByMember,
      },
    };
  } catch (error) {
    console.error("팀 Todo 조회 오류:", error);
    return { success: false, message: "팀 Todo 조회에 실패했습니다." };
  }
}

// 상태 업데이트
async function handleUpdateStatus(data: Record<string, unknown>) {
  try {
    const targetType = data.targetType as string;
    const searchTerm = data.searchTerm as string;
    const newStatus = data.newStatus as string;

    if (targetType === "project") {
      const project = await prisma.project.findFirst({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
      });

      if (!project) {
        return { success: false, message: `"${searchTerm}" 프로젝트를 찾을 수 없습니다.` };
      }

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { status: newStatus },
        include: { Client: { select: { name: true } } },
      });

      const statusLabels: Record<string, string> = {
        QUOTING: "견적 중",
        IN_PROGRESS: "진행 중",
        COMPLETED: "완료",
        CANCELLED: "취소",
      };

      return {
        success: true,
        intent: "update_status",
        data: {
          targetType: "project",
          name: updated.name,
          clientName: updated.Client.name,
          previousStatus: statusLabels[project.status] || project.status,
          newStatus: statusLabels[newStatus] || newStatus,
        },
      };
    } else if (targetType === "settlement") {
      const settlement = await prisma.projectInfluencer.findFirst({
        where: {
          Influencer: { name: { contains: searchTerm, mode: "insensitive" } },
          paymentStatus: { in: ["PENDING", "REQUESTED"] },
        },
        include: {
          Influencer: { select: { name: true } },
          Project: { select: { name: true } },
        },
      });

      if (!settlement) {
        return { success: false, message: `"${searchTerm}" 인플루언서의 미완료 정산을 찾을 수 없습니다.` };
      }

      const updated = await prisma.projectInfluencer.update({
        where: { id: settlement.id },
        data: {
          paymentStatus: newStatus === "COMPLETED" ? "COMPLETED" : "PENDING",
          // 스키마에 없는 paidAt을 쓰던 탓에 Slack 정산 완료 처리가 항상 실패했다
          paymentDate: newStatus === "COMPLETED" ? new Date() : null,
        },
        include: {
          Influencer: { select: { name: true } },
          Project: { select: { name: true } },
        },
      });

      return {
        success: true,
        intent: "update_status",
        data: {
          targetType: "settlement",
          influencerName: updated.Influencer.name,
          projectName: updated.Project.name,
          fee: updated.fee,
          newStatus: newStatus === "COMPLETED" ? "완료" : "대기",
        },
      };
    }

    return { success: false, message: "지원하지 않는 대상 유형입니다." };
  } catch (error) {
    console.error("상태 업데이트 오류:", error);
    return { success: false, message: "상태 업데이트에 실패했습니다." };
  }
}

// 통합 검색
async function handleSmartSearch(data: Record<string, unknown>) {
  try {
    const searchTerm = data.searchTerm as string;
    const searchType = (data.searchType as string) || "all";

    const results: Record<string, unknown[]> = {};

    // 클라이언트 검색
    if (searchType === "all" || searchType === "client") {
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { contactName: { contains: searchTerm, mode: "insensitive" } },
            { industry: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: 5,
      });
      if (clients.length > 0) {
        results.clients = clients.map((c) => ({
          name: c.name,
          contactName: c.contactName,
          status: c.status,
        }));
      }
    }

    // 프로젝트 검색
    if (searchType === "all" || searchType === "project") {
      const projects = await prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { memo: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        include: { Client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      if (projects.length > 0) {
        const statusLabels: Record<string, string> = {
          QUOTING: "견적 중",
          IN_PROGRESS: "진행 중",
          COMPLETED: "완료",
          CANCELLED: "취소",
        };
        results.projects = projects.map((p) => ({
          name: p.name,
          clientName: p.Client.name,
          status: statusLabels[p.status] || p.status,
          contractAmount: p.contractAmount,
        }));
      }
    }

    // 인플루언서 검색
    if (searchType === "all" || searchType === "influencer") {
      const influencers = await prisma.influencer.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { instagramId: { contains: searchTerm, mode: "insensitive" } },
            { categories: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: 5,
      });
      if (influencers.length > 0) {
        results.influencers = influencers.map((i) => ({
          name: i.name,
          instagramId: i.instagramId || "-",
          categories: i.categories || "-",
        }));
      }
    }

    // 거래 검색
    if (searchType === "all" || searchType === "transaction") {
      const transactions = await prisma.transaction.findMany({
        where: {
          memo: { contains: searchTerm, mode: "insensitive" },
        },
        orderBy: { date: "desc" },
        take: 5,
      });
      if (transactions.length > 0) {
        results.transactions = transactions.map((t) => ({
          type: t.type === "EXPENSE" ? "지출" : "수입",
          amount: t.amount,
          memo: t.memo,
          date: t.date.toLocaleDateString("ko-KR"),
        }));
      }
    }

    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return {
      success: true,
      intent: "smart_search",
      data: {
        searchTerm,
        found: totalResults > 0,
        totalResults,
        results,
      },
    };
  } catch (error) {
    console.error("검색 오류:", error);
    return { success: false, message: "검색에 실패했습니다." };
  }
}

// 후속 질문 처리
async function handleFollowUp(data: Record<string, unknown>, channelId: string) {
  try {
    const followUpType = data.followUpType as string;
    const context = conversationContexts.get(channelId);

    if (!context || Date.now() - context.timestamp > CONTEXT_TTL) {
      return {
        success: false,
        message: "이전 대화 내용이 없습니다. 새로운 질문을 해주세요.",
      };
    }

    // 이전 인텐트에 따라 후속 처리
    if (followUpType === "detail") {
      // 더 자세한 정보 제공
      return {
        success: true,
        intent: "follow_up",
        data: {
          type: "detail",
          originalIntent: context.lastIntent,
          originalData: context.lastData,
          detailedResult: context.lastResult,
        },
      };
    } else if (followUpType === "compare") {
      // 비교 데이터 (예: 지난달)
      const compareContext = data.context as string;
      if (context.lastIntent === "query_spending" || context.lastIntent === "query_dashboard") {
        // 지난달 데이터로 재조회
        const newData = { ...context.lastData, period: "last_month" };
        if (context.lastIntent === "query_spending") {
          return await handleQuerySpending(newData);
        }
      }
      return {
        success: true,
        intent: "follow_up",
        data: {
          type: "compare",
          context: compareContext,
          message: "비교 데이터를 조회했습니다.",
        },
      };
    }

    return {
      success: true,
      intent: "follow_up",
      data: {
        type: followUpType,
        message: "추가 정보입니다.",
        originalContext: context,
      },
    };
  } catch (error) {
    console.error("후속 질문 처리 오류:", error);
    return { success: false, message: "후속 질문 처리에 실패했습니다." };
  }
}

// 대화 맥락 저장
function saveConversationContext(
  channelId: string,
  intent: string,
  data: Record<string, unknown>,
  result: Record<string, unknown>
) {
  conversationContexts.set(channelId, {
    lastIntent: intent,
    lastData: data,
    lastResult: result,
    timestamp: Date.now(),
  });

  // TTL 후 자동 삭제
  setTimeout(() => {
    const ctx = conversationContexts.get(channelId);
    if (ctx && Date.now() - ctx.timestamp >= CONTEXT_TTL) {
      conversationContexts.delete(channelId);
    }
  }, CONTEXT_TTL);
}

// 리포트 생성 (직접 생성)
async function handleGenerateReport(data: Record<string, unknown>) {
  try {
    const reportType = (data.reportType as string) || "weekly";

    // 직접 리포트 데이터 생성
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    if (reportType === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      periodLabel = `${now.getMonth() + 1}월`;
    } else {
      // weekly
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "이번주";
    }

    // 거래 데이터 조회
    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });

    const revenue = transactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    // 프로젝트 현황
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { status: "IN_PROGRESS" },
          { endDate: { gte: startDate, lte: endDate } },
        ],
      },
      include: { Client: { select: { name: true } } },
    });

    // 정산 대기
    const pendingSettlements = await prisma.projectInfluencer.findMany({
      where: {
        paymentStatus: { in: ["PENDING", "REQUESTED"] },
      },
      include: {
        Influencer: { select: { name: true } },
        Project: { select: { name: true } },
      },
    });

    const pendingAmount = pendingSettlements.reduce((sum, s) => sum + s.fee, 0);

    // 지출 카테고리별
    const expenseByCategory = transactions
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
      OTHER_EXPENSE: "기타",
    };

    const topExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amount]) => ({
        category: categoryLabels[cat] || cat,
        amount,
      }));

    return {
      success: true,
      intent: "generate_report",
      data: {
        reportType,
        period: periodLabel,
        generated: true,
        summary: {
          revenue,
          expense,
          profit: revenue - expense,
          projectsInProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
          pendingSettlements: pendingSettlements.length,
          pendingSettlementAmount: pendingAmount,
          topExpenses,
        },
      },
    };
  } catch (error) {
    console.error("리포트 생성 오류:", error);
    return { success: false, message: "리포트 생성에 실패했습니다." };
  }
}

// 채널 메시지 1건 처리: AI 파싱 → 인텐트 처리 → 결과 답장
// POST가 Slack에 200을 돌려준 뒤 after()로 실행된다.
async function processChannelMessage(userMessage: string) {
  try {
    const parsed = await parseNaturalLanguage(userMessage);
    console.log("[Slack Webhook] AI 파싱 결과:", parsed.intent, parsed.confidence);

    // 신뢰도 낮으면 안내 메시지 (threshold 0.3으로 낮춤)
    if (parsed.confidence < 0.3 || parsed.intent === "unknown") {
      await sendSlackMessage(
        SLACK_CHANNEL_ID,
        "요청을 이해하지 못했습니다. 다음과 같이 입력해보세요:\n" +
          "- 지출: \"15000원 커피 지출\"\n" +
          "- 일정: \"15일 미팅 일정\"\n" +
          "- 인플루언서: \"인플루언서 OOO 추가\"\n" +
          "- 현황: \"이번 달 현황\""
      );
      return;
    }

    // 기본 사용자 ID 조회
    const userId = await getDefaultUserId();

    // 인텐트 처리
    const result = await handleIntent(parsed, userId);

    // 결과 메시지 전송
    if (result.success) {
      const message = formatSuccessMessage(result.intent!, result.data!);
      await sendSlackMessage(SLACK_CHANNEL_ID, message);

      // 대화 맥락 저장 (follow_up 기능용)
      saveConversationContext(
        SLACK_CHANNEL_ID,
        result.intent!,
        parsed.data,
        result.data as Record<string, unknown>
      );
    } else {
      const errorMessage =
        "message" in result && typeof result.message === "string"
          ? result.message
          : "요청을 처리하지 못했습니다.";
      await sendSlackMessage(SLACK_CHANNEL_ID, formatErrorMessage(errorMessage));
    }
  } catch (error) {
    console.error("[Slack Webhook] 메시지 처리 오류:", error);
    try {
      await sendSlackMessage(SLACK_CHANNEL_ID, formatErrorMessage("요청 처리 중 오류가 발생했습니다."));
    } catch {
      // 답장 실패는 로그만 남긴다 (sendSlackMessage가 이미 기록)
    }
  }
}

// POST 핸들러 - Slack 이벤트 수신
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // 서명 검증을 가장 먼저 한다 (url_verification 요청도 Slack이 서명해서 보낸다)
    const timestamp = request.headers.get("x-slack-request-timestamp") || "";
    const signature = request.headers.get("x-slack-signature") || "";

    if (!verifySlackRequest(process.env.SLACK_SIGNING_SECRET, rawBody, timestamp, signature)) {
      console.error("[Slack Webhook] 서명 검증 실패");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // URL 검증 (Event Subscriptions 설정 시 필요)
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    if (body.type !== "event_callback") {
      return NextResponse.json({ ok: true });
    }

    const event = body.event;
    const eventId: unknown = body.event_id;

    // 봇 메시지 무시 (무한 루프 방지)
    if (event?.bot_id || event?.subtype === "bot_message") {
      return NextResponse.json({ ok: true });
    }

    // 특정 채널만 처리
    if (event?.channel !== SLACK_CHANNEL_ID) {
      return NextResponse.json({ ok: true });
    }

    if (event.type === "message" && event.text && typeof eventId === "string") {
      if (!(await claimSlackEvent(eventId))) {
        console.log("[Slack Webhook] 중복 이벤트 무시:", eventId);
        return NextResponse.json({ ok: true });
      }

      console.log("[Slack Webhook] 메시지 이벤트 접수:", eventId);
      // Slack에는 바로 200을 돌려주고(3초 제한), 처리는 응답 후에 이어서 실행
      const userMessage: string = event.text;
      after(() => processChannelMessage(userMessage));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Slack 웹훅 처리 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET 핸들러 - 헬스체크
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Slack webhook endpoint is running",
  });
}
