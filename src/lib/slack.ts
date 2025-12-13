import { WebClient } from "@slack/web-api";
import crypto from "crypto";

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Slack 메시지 전송
export async function sendSlackMessage(channel: string, text: string, blocks?: unknown[]) {
  try {
    const result = await slackClient.chat.postMessage({
      channel,
      text,
      blocks: blocks as never[],
    });
    return result;
  } catch (error) {
    console.error("Slack 메시지 전송 실패:", error);
    throw error;
  }
}

// Slack 요청 서명 검증
export function verifySlackRequest(
  signingSecret: string,
  requestBody: string,
  timestamp: string,
  signature: string
): boolean {
  // 5분 이상 된 요청은 거부 (replay attack 방지)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${requestBody}`;
  const mySignature = `v0=${crypto
    .createHmac("sha256", signingSecret)
    .update(sigBaseString)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

// 응답 포맷터 - 성공
export function formatSuccessMessage(intent: string, data: Record<string, unknown>): string {
  const messages: Record<string, (d: Record<string, unknown>) => string> = {
    add_transaction: (d) =>
      `${d.type === "EXPENSE" ? "지출" : "수입"}이 등록되었습니다.\n` +
      `- 금액: ${Number(d.amount).toLocaleString()}원\n` +
      `- 카테고리: ${d.categoryLabel || d.category}\n` +
      `- 메모: ${d.memo || "-"}`,

    add_calendar: (d) =>
      `일정이 등록되었습니다.\n` +
      `- 제목: ${d.title}\n` +
      `- 날짜: ${d.date}\n` +
      `- 유형: ${d.typeLabel || d.type}`,

    add_influencer: (d) =>
      `인플루언서가 등록되었습니다.\n` +
      `- 이름: ${d.name}\n` +
      `- 인스타그램: ${d.instagramId || "-"}\n` +
      `- 카테고리: ${d.categories || "-"}`,

    add_client: (d) =>
      `클라이언트가 등록되었습니다.\n` +
      `- 회사명: ${d.name}\n` +
      `- 담당자: ${d.contactName || "-"}\n` +
      `- 업종: ${d.industry || "-"}`,

    query_dashboard: (d) =>
      `이번 달 현황:\n` +
      `- 매출: ${Number(d.revenue || 0).toLocaleString()}원\n` +
      `- 지출: ${Number(d.expense || 0).toLocaleString()}원\n` +
      `- 순이익: ${Number(d.profit || 0).toLocaleString()}원`,

    unknown: () => "요청을 처리했습니다.",
  };

  const formatter = messages[intent] || messages.unknown;
  return formatter(data);
}

// 응답 포맷터 - 에러
export function formatErrorMessage(error: string): string {
  return `처리 중 오류가 발생했습니다: ${error}`;
}

// 처리 중 메시지
export function formatProcessingMessage(): string {
  return "요청을 처리하고 있습니다...";
}
