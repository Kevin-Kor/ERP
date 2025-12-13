import OpenAI from "openai";
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from "./utils";

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

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
const SYSTEM_PROMPT = `당신은 ERP 시스템의 자연어 파서입니다. 사용자가 어떤 형식으로 입력하든 의도를 파악하고 데이터를 추출해야 합니다.

**중요: 사용자는 정해진 포맷 없이 자유롭게 입력합니다. 유연하게 해석하세요.**

오늘 날짜: ${new Date().toISOString().split("T")[0]}

## 지원하는 인텐트

1. **add_transaction** - 지출/수입/비용/매출 등 금전 관련
   - 키워드: 지출, 비용, 결제, 구매, 샀다, 썼다, 매출, 수입, 입금, 받았다

2. **add_calendar** - 일정/미팅/회의/약속 관련
   - 키워드: 일정, 미팅, 회의, 약속, 스케줄, ~일에, ~에 만나

3. **add_influencer** - 인플루언서 등록
   - 키워드: 인플루언서, 크리에이터, 유튜버, 인스타그래머

4. **add_client** - 클라이언트/고객사 등록
   - 키워드: 클라이언트, 고객, 거래처, 업체

5. **query_dashboard** - 현황/통계 조회
   - 키워드: 현황, 얼마, 통계, 이번달, 지난달

## 지출 카테고리 (자동 매칭)
- 식비/음식/밥/커피/카페/식당 → "FOOD"
- 교통/택시/버스/지하철/기차/KTX → "TRANSPORTATION"
- 사무용품/문구/소모품 → "SUPPLIES"
- 광고/마케팅/홍보 → "AD_EXPENSE"
- 인플루언서/크리에이터 비용 → "INFLUENCER_FEE"
- 콘텐츠/영상/제작 → "CONTENT_PRODUCTION"
- 기타 → "OTHER_EXPENSE"

## 수입 카테고리
- 광고비/광고수입 → "AD_REVENUE"
- 캠페인/대행 → "CAMPAIGN_FEE"
- 고정관리/월정액 → "FIXED_MANAGEMENT"
- 기타 → "OTHER_REVENUE"

## 응답 형식 (JSON)
{
  "intent": "인텐트명",
  "confidence": 0.0-1.0,
  "data": { ... }
}

## 예시 (다양한 입력 형태)

입력: "지출 : 15000원 커피 지출"
출력: {"intent": "add_transaction", "confidence": 0.95, "data": {"type": "EXPENSE", "amount": 15000, "category": "FOOD", "memo": "커피", "date": "${new Date().toISOString().split("T")[0]}"}}

입력: "오늘 날짜로 지출작성해줘. 카페 15,000원"
출력: {"intent": "add_transaction", "confidence": 0.95, "data": {"type": "EXPENSE", "amount": 15000, "category": "FOOD", "memo": "카페", "date": "${new Date().toISOString().split("T")[0]}"}}

입력: "점심 먹었어 12000원"
출력: {"intent": "add_transaction", "confidence": 0.9, "data": {"type": "EXPENSE", "amount": 12000, "category": "FOOD", "memo": "점심", "date": "${new Date().toISOString().split("T")[0]}"}}

입력: "택시비 35000"
출력: {"intent": "add_transaction", "confidence": 0.9, "data": {"type": "EXPENSE", "amount": 35000, "category": "TRANSPORTATION", "memo": "택시", "date": "${new Date().toISOString().split("T")[0]}"}}

입력: "A사에서 500만원 입금됨"
출력: {"intent": "add_transaction", "confidence": 0.9, "data": {"type": "REVENUE", "amount": 5000000, "category": "OTHER_REVENUE", "memo": "A사 입금", "date": "${new Date().toISOString().split("T")[0]}"}}

입력: "15일에 B사 미팅있어"
출력: {"intent": "add_calendar", "confidence": 0.9, "data": {"title": "B사 미팅", "date": "${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-15", "type": "MEETING"}}

입력: "다음주 월요일 광고주 회의"
출력: {"intent": "add_calendar", "confidence": 0.85, "data": {"title": "광고주 회의", "date": "다음주 월요일 계산 필요", "type": "MEETING"}}

입력: "인플루언서 김민수 등록해줘 인스타 @minsu_kim"
출력: {"intent": "add_influencer", "confidence": 0.95, "data": {"name": "김민수", "instagramId": "minsu_kim"}}

입력: "이번달 지출 얼마야?"
출력: {"intent": "query_dashboard", "confidence": 0.9, "data": {"period": "this_month"}}

**핵심: 금액이 있으면 거래(add_transaction), 날짜+일정이면 캘린더(add_calendar), 사람 이름+등록이면 인플루언서/클라이언트입니다.**`;

// 자연어 파싱 함수
export async function parseNaturalLanguage(text: string): Promise<ParsedResult> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
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
