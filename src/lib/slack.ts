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

// 금액 포맷팅 헬퍼
function formatAmountHelper(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1).replace(/\.0$/, "") + "만원";
  }
  return amount.toLocaleString("ko-KR") + "원";
}

// 응답 포맷터 - 성공
export function formatSuccessMessage(intent: string, data: Record<string, unknown>): string {
  const messages: Record<string, (d: Record<string, unknown>) => string> = {
    add_transaction: (d) =>
      `✅ ${d.type === "EXPENSE" ? "지출" : "수입"}이 등록되었습니다.\n` +
      `• 금액: ${Number(d.amount).toLocaleString()}원\n` +
      `• 카테고리: ${d.categoryLabel || d.category}\n` +
      `• 메모: ${d.memo || "-"}`,

    add_calendar: (d) =>
      `✅ 일정이 등록되었습니다.\n` +
      `• 제목: ${d.title}\n` +
      `• 날짜: ${d.date}\n` +
      `• 유형: ${d.typeLabel || d.type}`,

    add_influencer: (d) =>
      `✅ 인플루언서가 등록되었습니다.\n` +
      `• 이름: ${d.name}\n` +
      `• 인스타그램: ${d.instagramId || "-"}\n` +
      `• 카테고리: ${d.categories || "-"}`,

    add_client: (d) =>
      `✅ 클라이언트가 등록되었습니다.\n` +
      `• 회사명: ${d.name}\n` +
      `• 담당자: ${d.contactName || "-"}\n` +
      `• 업종: ${d.industry || "-"}`,

    query_dashboard: (d) =>
      `📊 *이번 달 현황*\n` +
      `• 매출: ${formatAmountHelper(Number(d.revenue || 0))}\n` +
      `• 지출: ${formatAmountHelper(Number(d.expense || 0))}\n` +
      `• 순이익: ${formatAmountHelper(Number(d.profit || 0))}`,

    query_client: (d) => {
      if (!d.found) {
        return `🔍 "${d.searchTerm}" 클라이언트를 찾을 수 없습니다.`;
      }
      const clients = d.clients as Array<Record<string, unknown>>;
      let msg = `🏢 *클라이언트 검색 결과* (${clients.length}건)\n\n`;
      clients.forEach((c, i) => {
        msg += `*${i + 1}. ${c.name}*\n`;
        msg += `• 상태: ${c.status === "ACTIVE" ? "활성" : c.status}\n`;
        msg += `• 총 매출: ${formatAmountHelper(Number(c.totalRevenue))}\n`;
        msg += `• 미수금: ${formatAmountHelper(Number(c.unpaidRevenue))}\n`;
        msg += `• 진행 프로젝트: ${c.activeProjects}건\n`;
        if (Number(c.pendingSettlementCount) > 0) {
          msg += `• 정산 대기: ${formatAmountHelper(Number(c.pendingSettlementAmount))} (${c.pendingSettlementCount}건)\n`;
        }
        msg += `\n`;
      });
      return msg.trim();
    },

    query_project: (d) => {
      if (!d.found) {
        return `🔍 조건에 맞는 프로젝트를 찾을 수 없습니다.`;
      }
      const projects = d.projects as Array<Record<string, unknown>>;
      let msg = `📁 *프로젝트 검색 결과* (${d.count}건)\n\n`;
      projects.slice(0, 5).forEach((p, i) => {
        msg += `*${i + 1}. ${p.name}*\n`;
        msg += `• 클라이언트: ${p.clientName}\n`;
        msg += `• 상태: ${p.status}\n`;
        msg += `• 기간: ${p.startDate} ~ ${p.endDate}\n`;
        msg += `• 금액: ${formatAmountHelper(Number(p.contractAmount))}\n`;
        if (Number(p.influencerCount) > 0) {
          const influencers = p.influencers as string[];
          msg += `• 인플루언서: ${influencers.slice(0, 3).join(", ")}${influencers.length > 3 ? ` 외 ${influencers.length - 3}명` : ""}\n`;
        }
        msg += `\n`;
      });
      if (Number(d.count) > 5) {
        msg += `_...외 ${Number(d.count) - 5}건 더 있음_`;
      }
      return msg.trim();
    },

    query_settlement: (d) => {
      if (!d.found) {
        return `🔍 정산 내역을 찾을 수 없습니다.`;
      }
      const settlements = d.settlements as Array<Record<string, unknown>>;
      let msg = `💸 *정산 현황* (${d.count}건)\n`;
      msg += `📌 총 대기 금액: ${formatAmountHelper(Number(d.totalPending))}\n\n`;
      settlements.slice(0, 10).forEach((s, i) => {
        msg += `${i + 1}. *${s.influencerName}* - ${formatAmountHelper(Number(s.fee))}\n`;
        msg += `   ${s.projectName} (${s.clientName})\n`;
        msg += `   상태: ${s.status} | 마감: ${s.dueDate}\n\n`;
      });
      if (Number(d.count) > 10) {
        msg += `_...외 ${Number(d.count) - 10}건 더 있음_`;
      }
      return msg.trim();
    },

    query_spending: (d) => {
      const breakdown = d.categoryBreakdown as Array<Record<string, unknown>>;
      let msg = `📉 *${d.period} 지출 분석*\n`;
      msg += `💰 총 지출: ${formatAmountHelper(Number(d.totalExpense))} (${d.transactionCount}건)\n\n`;
      if (breakdown.length > 0) {
        msg += `*카테고리별 상세*\n`;
        breakdown.forEach((c, i) => {
          msg += `${i + 1}. ${c.category}: ${formatAmountHelper(Number(c.amount))} (${c.percent}%)\n`;
        });
      }
      return msg.trim();
    },

    query_influencer: (d) => {
      if (!d.found) {
        return `🔍 "${d.searchTerm}" 인플루언서를 찾을 수 없습니다.`;
      }
      const influencers = d.influencers as Array<Record<string, unknown>>;
      let msg = `👤 *인플루언서 검색 결과*\n\n`;
      influencers.forEach((inf, i) => {
        msg += `*${i + 1}. ${inf.name}*\n`;
        if (inf.instagramId !== "-") msg += `• 인스타: @${inf.instagramId}\n`;
        if (inf.youtubeChannel !== "-") msg += `• 유튜브: ${inf.youtubeChannel}\n`;
        msg += `• 카테고리: ${inf.categories}\n`;
        if (inf.followerCount) msg += `• 팔로워: ${Number(inf.followerCount).toLocaleString()}명\n`;
        msg += `• 협업: ${inf.totalProjects}건 | 총 정산: ${formatAmountHelper(Number(inf.totalEarnings))}\n`;
        const recent = inf.recentProjects as Array<Record<string, unknown>>;
        if (recent.length > 0) {
          msg += `• 최근: ${recent.map((r) => r.projectName).join(", ")}\n`;
        }
        msg += `\n`;
      });
      return msg.trim();
    },

    query_schedule: (d) => {
      const schedules = d.schedules as Array<Record<string, unknown>>;
      const summary = d.summary as Record<string, number>;

      if (schedules.length === 0) {
        return `📅 *${d.period} 일정*\n등록된 일정이 없습니다.`;
      }

      let msg = `📅 *${d.period} 일정* (총 ${d.count}건)\n`;
      msg += `• 미팅: ${summary.meetings}건 | 프로젝트 마감: ${summary.projectDeadlines}건 | 정산 마감: ${summary.settlementDeadlines}건\n\n`;

      schedules.slice(0, 10).forEach((s, i) => {
        const icon = s.category === "미팅" ? "🤝" :
          s.category === "프로젝트 마감" ? "📁" :
          s.category === "정산 마감" ? "💰" : "📌";
        msg += `${icon} *${s.date}* - ${s.title}\n`;
        if (s.amount) {
          msg += `   └ ${formatAmountHelper(Number(s.amount))}\n`;
        }
      });

      if (schedules.length > 10) {
        msg += `\n_...외 ${schedules.length - 10}건 더 있음_`;
      }
      return msg.trim();
    },

    update_status: (d) => {
      if (d.targetType === "project") {
        return `✅ *프로젝트 상태 업데이트*\n` +
          `• 프로젝트: ${d.name}\n` +
          `• 클라이언트: ${d.clientName}\n` +
          `• 상태: ${d.previousStatus} → *${d.newStatus}*`;
      } else if (d.targetType === "settlement") {
        return `✅ *정산 상태 업데이트*\n` +
          `• 인플루언서: ${d.influencerName}\n` +
          `• 프로젝트: ${d.projectName}\n` +
          `• 금액: ${formatAmountHelper(Number(d.fee))}\n` +
          `• 상태: *${d.newStatus}*`;
      }
      return `✅ 상태가 업데이트되었습니다.`;
    },

    smart_search: (d) => {
      if (!d.found) {
        return `🔍 "${d.searchTerm}" 검색 결과가 없습니다.`;
      }

      const results = d.results as Record<string, unknown[]>;
      let msg = `🔍 *"${d.searchTerm}" 검색 결과* (${d.totalResults}건)\n\n`;

      if (results.clients) {
        msg += `*🏢 클라이언트* (${results.clients.length}건)\n`;
        results.clients.forEach((c: Record<string, unknown>) => {
          msg += `• ${c.name} (${c.contactName}) - ${c.status === "ACTIVE" ? "활성" : c.status}\n`;
        });
        msg += `\n`;
      }

      if (results.projects) {
        msg += `*📁 프로젝트* (${results.projects.length}건)\n`;
        results.projects.forEach((p: Record<string, unknown>) => {
          msg += `• ${p.name} (${p.clientName}) - ${p.status}\n`;
        });
        msg += `\n`;
      }

      if (results.influencers) {
        msg += `*👤 인플루언서* (${results.influencers.length}건)\n`;
        results.influencers.forEach((i: Record<string, unknown>) => {
          msg += `• ${i.name} ${i.instagramId !== "-" ? `(@${i.instagramId})` : ""}\n`;
        });
        msg += `\n`;
      }

      if (results.transactions) {
        msg += `*💰 거래* (${results.transactions.length}건)\n`;
        results.transactions.forEach((t: Record<string, unknown>) => {
          msg += `• ${t.date} ${t.type} ${formatAmountHelper(Number(t.amount))} - ${t.memo}\n`;
        });
      }

      return msg.trim();
    },

    follow_up: (d) => {
      if (d.type === "detail") {
        return `📝 *상세 정보*\n이전 조회: ${d.originalIntent}\n\n자세한 내용은 위 결과를 참고해주세요.`;
      } else if (d.type === "compare") {
        return `📊 *비교 데이터*\n${d.context || "지난 기간"} 데이터입니다.`;
      }
      return `ℹ️ 추가 정보입니다.`;
    },

    generate_report: (d) => {
      const typeLabel = d.reportType === "monthly" ? "월간" : "주간";
      const summary = d.summary as Record<string, unknown>;

      if (!summary) {
        return `📊 *${typeLabel} 리포트가 생성되었습니다.*`;
      }

      let msg = `📊 *${d.period} ${typeLabel} 리포트*\n\n`;
      msg += `*💰 재무 요약*\n`;
      msg += `• 매출: ${formatAmountHelper(Number(summary.revenue))}\n`;
      msg += `• 지출: ${formatAmountHelper(Number(summary.expense))}\n`;
      msg += `• 순이익: ${formatAmountHelper(Number(summary.profit))}\n\n`;

      msg += `*📁 현황*\n`;
      msg += `• 진행 중 프로젝트: ${summary.projectsInProgress}건\n`;
      msg += `• 정산 대기: ${summary.pendingSettlements}건 (${formatAmountHelper(Number(summary.pendingSettlementAmount))})\n\n`;

      const topExpenses = summary.topExpenses as Array<Record<string, unknown>>;
      if (topExpenses && topExpenses.length > 0) {
        msg += `*📉 지출 TOP 3*\n`;
        topExpenses.forEach((e, i) => {
          msg += `${i + 1}. ${e.category}: ${formatAmountHelper(Number(e.amount))}\n`;
        });
      }

      return msg.trim();
    },

    unknown: () => "✅ 요청을 처리했습니다.",
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
