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
    default:
      return {
        success: false,
        message: "이해하지 못한 요청입니다. 다시 시도해주세요.\n\n지원 명령어:\n- 지출/수입 등록: \"15000원 커피 지출\"\n- 일정 추가: \"15일 미팅 일정\"\n- 인플루언서 추가: \"인플루언서 OOO 추가\"\n- 대시보드 조회: \"이번 달 현황\"",
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
