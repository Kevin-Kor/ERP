import OpenAI from "openai";
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from "./utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 인텐트 타입 정의
export type Intent =
  | "add_transaction"
  | "add_calendar"
  | "add_influencer"
  | "add_client"
  | "add_project"
  | "query_dashboard"
  | "unknown";

// 파싱 결과 타입
export interface ParsedResult {
  intent: Intent;
  confidence: number;
  data: Record<string, unknown>;
  rawText: string;
}

// 카테고리 매핑 정보
const expenseCategoryMap = EXPENSE_CATEGORIES.reduce((acc, cat) => {
  acc[cat.label] = cat.value;
  return acc;
}, {} as Record<string, string>);

const revenueCategoryMap = REVENUE_CATEGORIES.reduce((acc, cat) => {
  acc[cat.label] = cat.value;
  return acc;
}, {} as Record<string, string>);

// AI 프롬프트
const SYSTEM_PROMPT = `당신은 ERP 시스템의 자연어 파서입니다. 사용자의 메시지를 분석하여 의도와 데이터를 추출합니다.

오늘 날짜: ${new Date().toISOString().split("T")[0]}

지원하는 인텐트:
1. add_transaction - 수입/지출 등록
2. add_calendar - 일정 추가
3. add_influencer - 인플루언서 추가
4. add_client - 클라이언트 추가
5. add_project - 프로젝트 추가
6. query_dashboard - 대시보드 조회

지출 카테고리: ${EXPENSE_CATEGORIES.map((c) => c.label).join(", ")}
수입 카테고리: ${REVENUE_CATEGORIES.map((c) => c.label).join(", ")}

응답 형식 (JSON):
{
  "intent": "인텐트명",
  "confidence": 0.0-1.0,
  "data": {
    // 인텐트별 필요한 데이터
  }
}

인텐트별 data 필드:

add_transaction:
- type: "EXPENSE" 또는 "REVENUE"
- amount: 숫자 (원 단위)
- category: 카테고리값 (위 목록 참조)
- memo: 메모
- date: "YYYY-MM-DD" (기본값: 오늘)

add_calendar:
- title: 일정 제목
- date: "YYYY-MM-DD"
- type: "MEETING" | "DEADLINE" | "PAYMENT" | "OTHER"
- memo: 메모 (선택)

add_influencer:
- name: 이름
- instagramId: 인스타그램 ID (선택)
- youtubeChannel: 유튜브 채널 (선택)
- categories: 카테고리 배열 (선택)
- memo: 메모 (선택)

add_client:
- name: 회사명
- contactName: 담당자명 (선택)
- phone: 연락처 (선택)
- industry: 업종 (선택)
- memo: 메모 (선택)

query_dashboard:
- period: "this_month" | "last_month" | "this_year"

예시:
입력: "15000원 커피 지출"
출력: {"intent": "add_transaction", "confidence": 0.95, "data": {"type": "EXPENSE", "amount": 15000, "category": "FOOD", "memo": "커피", "date": "${new Date().toISOString().split("T")[0]}"}}

입력: "15일에 A사 미팅"
출력: {"intent": "add_calendar", "confidence": 0.9, "data": {"title": "A사 미팅", "date": "${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-15", "type": "MEETING"}}

입력: "인플루언서 김철수 추가해줘"
출력: {"intent": "add_influencer", "confidence": 0.9, "data": {"name": "김철수"}}`;

// 자연어 파싱 함수
export async function parseNaturalLanguage(text: string): Promise<ParsedResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI 응답이 비어있습니다");
    }

    const parsed = JSON.parse(content);

    // 카테고리 값 변환 (한글 라벨 -> 영문 값)
    if (parsed.intent === "add_transaction" && parsed.data?.category) {
      const categoryLabel = parsed.data.category;
      if (parsed.data.type === "EXPENSE" && expenseCategoryMap[categoryLabel]) {
        parsed.data.categoryLabel = categoryLabel;
        parsed.data.category = expenseCategoryMap[categoryLabel];
      } else if (parsed.data.type === "REVENUE" && revenueCategoryMap[categoryLabel]) {
        parsed.data.categoryLabel = categoryLabel;
        parsed.data.category = revenueCategoryMap[categoryLabel];
      }
    }

    return {
      intent: parsed.intent || "unknown",
      confidence: parsed.confidence || 0,
      data: parsed.data || {},
      rawText: text,
    };
  } catch (error) {
    console.error("AI 파싱 오류:", error);
    return {
      intent: "unknown",
      confidence: 0,
      data: {},
      rawText: text,
    };
  }
}

// 날짜 문자열 정규화
export function normalizeDate(dateStr: string): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // "15일" 형태
  const dayMatch = dateStr.match(/(\d{1,2})일/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // "다음주 월요일" 등의 상대적 날짜는 AI가 처리
  return dateStr;
}
