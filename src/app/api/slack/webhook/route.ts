import { NextRequest, NextResponse } from "next/server";
import { verifySlackRequest, sendSlackMessage, formatSuccessMessage, formatErrorMessage } from "@/lib/slack";
import { parseNaturalLanguage, type ParsedResult } from "@/lib/ai-parser";
import { prisma } from "@/lib/prisma";

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET!;

// 중복 이벤트 방지를 위한 캐시 (최근 처리한 event_id 저장)
const processedEvents = new Set<string>();
const EVENT_CACHE_TTL = 60000; // 60초

function isEventProcessed(eventId: string): boolean {
  if (processedEvents.has(eventId)) {
    return true;
  }
  processedEvents.add(eventId);
  // 60초 후 캐시에서 제거
  setTimeout(() => processedEvents.delete(eventId), EVENT_CACHE_TTL);
  return false;
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
          "- 지출: \"이번달 지출 분석\"\n\n" +
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

// 리포트 생성
async function handleGenerateReport(data: Record<string, unknown>) {
  try {
    const reportType = (data.reportType as string) || "weekly";
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";

    // 내부 API 호출로 리포트 생성
    const endpoint = reportType === "monthly"
      ? `${baseUrl}/api/cron/monthly-report`
      : `${baseUrl}/api/cron/weekly-report`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET || "dev"}`,
      },
    });

    if (!response.ok) {
      throw new Error(`리포트 생성 실패: ${response.status}`);
    }

    return {
      success: true,
      intent: "generate_report",
      data: {
        reportType,
        generated: true,
      },
    };
  } catch (error) {
    console.error("리포트 생성 오류:", error);
    return { success: false, message: "리포트 생성에 실패했습니다." };
  }
}

// Slack URL 검증 (Event Subscriptions 설정 시 필요)
function handleUrlVerification(body: { challenge: string }) {
  return NextResponse.json({ challenge: body.challenge });
}

// POST 핸들러 - Slack 이벤트 수신
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    console.log("[Slack Webhook] Received:", JSON.stringify(body, null, 2));

    // URL 검증 (Slack 앱 설정 시)
    if (body.type === "url_verification") {
      return handleUrlVerification(body);
    }

    // 서명 검증
    const timestamp = request.headers.get("x-slack-request-timestamp") || "";
    const signature = request.headers.get("x-slack-signature") || "";

    if (!verifySlackRequest(SLACK_SIGNING_SECRET, rawBody, timestamp, signature)) {
      console.error("[Slack Webhook] 서명 검증 실패");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("[Slack Webhook] 서명 검증 통과");

    // 이벤트 처리
    if (body.type === "event_callback") {
      const event = body.event;
      const eventId = body.event_id;

      // 중복 이벤트 체크
      if (isEventProcessed(eventId)) {
        console.log("[Slack Webhook] 중복 이벤트 무시:", eventId);
        return NextResponse.json({ ok: true });
      }

      console.log("[Slack Webhook] Event:", event.type, "Channel:", event.channel, "Expected:", SLACK_CHANNEL_ID);

      // 봇 메시지 무시 (무한 루프 방지)
      if (event.bot_id || event.subtype === "bot_message") {
        console.log("[Slack Webhook] 봇 메시지 무시");
        return NextResponse.json({ ok: true });
      }

      // 특정 채널만 처리
      if (event.channel !== SLACK_CHANNEL_ID) {
        console.log("[Slack Webhook] 채널 불일치 - 무시:", event.channel, "!==", SLACK_CHANNEL_ID);
        return NextResponse.json({ ok: true });
      }

      // 메시지 이벤트 처리
      if (event.type === "message" && event.text) {
        const userMessage = event.text;
        console.log("[Slack Webhook] 메시지 수신:", userMessage);

        // AI 파싱
        const parsed = await parseNaturalLanguage(userMessage);
        console.log("[Slack Webhook] AI 파싱 결과:", JSON.stringify(parsed, null, 2));

        // 신뢰도 낮으면 안내 메시지 (threshold 0.3으로 낮춤)
        if (parsed.confidence < 0.3 || parsed.intent === "unknown") {
          console.log("[Slack Webhook] 신뢰도 낮음 또는 unknown:", parsed.confidence, parsed.intent);
          await sendSlackMessage(
            SLACK_CHANNEL_ID,
            "요청을 이해하지 못했습니다. 다음과 같이 입력해보세요:\n" +
              "- 지출: \"15000원 커피 지출\"\n" +
              "- 일정: \"15일 미팅 일정\"\n" +
              "- 인플루언서: \"인플루언서 OOO 추가\"\n" +
              "- 현황: \"이번 달 현황\""
          );
          return NextResponse.json({ ok: true });
        }

        // 기본 사용자 ID 조회
        const userId = await getDefaultUserId();

        // 인텐트 처리
        const result = await handleIntent(parsed, userId);

        // 결과 메시지 전송
        if (result.success) {
          const message = formatSuccessMessage(result.intent!, result.data!);
          await sendSlackMessage(SLACK_CHANNEL_ID, message);
        } else {
          await sendSlackMessage(SLACK_CHANNEL_ID, formatErrorMessage(result.message!));
        }
      }
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
    channel: SLACK_CHANNEL_ID,
  });
}
