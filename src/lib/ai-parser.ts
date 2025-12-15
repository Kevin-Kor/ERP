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
  | "query_client"
  | "query_project"
  | "query_settlement"
  | "query_spending"
  | "query_influencer"
  | "query_schedule"
  | "query_todo"
  | "update_status"
  | "smart_search"
  | "follow_up"
  | "generate_report"
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

// AI 프롬프트 생성 함수 (동적 날짜 포함)
function getSystemPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  return `당신은 ERP 시스템의 자연어 파서입니다. 사용자가 어떤 형식으로 입력하든 의도를 파악하고 데이터를 추출해야 합니다.

**중요: 사용자는 정해진 포맷 없이 자유롭게 입력합니다. 유연하게 해석하세요.**

오늘 날짜: ${today}

## 지원하는 인텐트

### 데이터 추가
1. **add_transaction** - 지출/수입/비용/매출 등 금전 관련
   - 키워드: 지출, 비용, 결제, 구매, 샀다, 썼다, 매출, 수입, 입금, 받았다

2. **add_calendar** - 일정/미팅/회의/약속 관련
   - 키워드: 일정, 미팅, 회의, 약속, 스케줄, ~일에, ~에 만나

3. **add_influencer** - 인플루언서 등록
   - 키워드: 인플루언서, 크리에이터, 유튜버, 인스타그래머, 추가해줘
   - data: {
       name: "이름 (필수)",
       instagramId: "인스타 계정이름 (@제외)",
       youtubeChannel: "유튜브 채널명",
       priceRange: "비용/단가 (예: 20만원)",
       bankAccount: "계좌정보 (계좌번호 / 은행명)",
       memo: "기타 메모"
     }
   - **중요**: 사용자가 여러 줄로 정보를 입력하면 각 필드를 파싱해서 추출

4. **add_client** - 클라이언트/고객사 등록
   - 키워드: 클라이언트, 고객, 거래처, 업체

### 조회/검색
5. **query_dashboard** - 전체 현황/통계 조회
   - 키워드: 현황, 전체 현황, 얼마, 통계, 이번달, 지난달, 요약

6. **query_client** - 특정 클라이언트 정보 조회
   - 키워드: [회사명] 정보, [회사명] 현황, [회사명] 정산, [회사명] 어때
   - data: { searchTerm: "회사명 또는 검색어" }

7. **query_project** - 특정 프로젝트 정보 조회
   - 키워드: [프로젝트명] 프로젝트, [프로젝트명] 진행상황, 캠페인 현황
   - data: { searchTerm: "프로젝트명 또는 검색어", status: "IN_PROGRESS"|"COMPLETED"|"QUOTING" (선택) }

8. **query_settlement** - 정산 현황 조회
   - 키워드: 정산 현황, 정산 대기, 미정산, [인플루언서명] 정산
   - data: { searchTerm: "인플루언서명 (선택)", status: "PENDING"|"COMPLETED" (선택) }

9. **query_spending** - 지출 분석 조회
   - 키워드: 지출 분석, 이번달 지출, 카테고리별 지출, 인플루언서 비용
   - data: { period: "this_month"|"last_month"|"this_week", category: "카테고리명 (선택)" }

10. **query_influencer** - 특정 인플루언서 정보 조회
    - 키워드: [인플루언서명] 정보, [인플루언서명] 협업, 인플루언서 찾기
    - data: { searchTerm: "인플루언서명 또는 검색어" }

11. **query_schedule** - 일정/마감/스케줄 조회 (프로젝트/캘린더)
    - 키워드: 이번주 일정, 마감, 스케줄, 내일 일정, 다음주 일정
    - data: { period: "today"|"tomorrow"|"this_week"|"next_week"|"this_month", type: "all"|"meeting"|"deadline"|"calendar" (선택) }

12. **query_todo** - 팀 Todo/할일 조회
    - 키워드: 할일, 해야할일, 뭐해야해, 뭐해야돼, Todo, 투두, 작업, [사람이름]이 뭐해야해
    - data: { memberName: "담당자 이름 (선택)" }

13. **update_status** - 프로젝트/정산/할일 상태 업데이트
    - 키워드: 완료 처리, 상태 변경, ~했어, ~끝났어, 취소해줘
    - data: { targetType: "project"|"settlement"|"todo", searchTerm: "대상명", newStatus: "COMPLETED"|"IN_PROGRESS"|"CANCELLED" }

14. **smart_search** - 통합 자연어 검색 (무엇이든 찾기)
    - 키워드: 찾아줘, 검색해줘, 어디있어, 뭐였지, 최근에 ~한 거
    - data: { searchTerm: "검색어", searchType: "all"|"client"|"project"|"influencer"|"transaction" (선택) }

15. **follow_up** - 이전 대화 맥락 기반 후속 질문
    - 키워드: 더 자세히, 그거, 아까 그거, 더 알려줘, 지난달은?
    - data: { followUpType: "detail"|"compare"|"extend", context: "맥락 정보" }

16. **generate_report** - 리포트 생성 요청
    - 키워드: 리포트, 보고서, 주간 리포트, 월간 리포트
    - data: { reportType: "weekly"|"monthly"|"daily" }

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

### 거래 등록
입력: "지출 : 15000원 커피 지출"
출력: {"intent": "add_transaction", "confidence": 0.95, "data": {"type": "EXPENSE", "amount": 15000, "category": "FOOD", "memo": "커피", "date": "${today}"}}

입력: "오늘 날짜로 지출작성해줘. 카페 15,000원"
출력: {"intent": "add_transaction", "confidence": 0.95, "data": {"type": "EXPENSE", "amount": 15000, "category": "FOOD", "memo": "카페", "date": "${today}"}}

입력: "택시비 35000"
출력: {"intent": "add_transaction", "confidence": 0.9, "data": {"type": "EXPENSE", "amount": 35000, "category": "TRANSPORTATION", "memo": "택시", "date": "${today}"}}

### 일정 등록
입력: "15일에 B사 미팅있어"
출력: {"intent": "add_calendar", "confidence": 0.9, "data": {"title": "B사 미팅", "date": "${year}-${month}-15", "type": "MEETING"}}

### 인플루언서 등록 (여러 줄 정보 파싱)
입력: "인플루언서 추가해줘
이름 : 용인뭐하지
인스타 계정이름 : all.about.yongin
비용: 20만원 (vat 별도)
계좌번호 : 100-032-321910 / 신한은행"
출력: {"intent": "add_influencer", "confidence": 0.95, "data": {"name": "용인뭐하지", "instagramId": "all.about.yongin", "priceRange": "20만원 (vat 별도)", "bankAccount": "100-032-321910 / 신한은행"}}

입력: "인플루언서 등록 - 김철수, 인스타: @beauty_kim, 유튜브: 뷰티킴, 단가 50만원"
출력: {"intent": "add_influencer", "confidence": 0.95, "data": {"name": "김철수", "instagramId": "beauty_kim", "youtubeChannel": "뷰티킴", "priceRange": "50만원"}}

### 조회 - 클라이언트
입력: "ABC 회사 정산 얼마 남았어?"
출력: {"intent": "query_client", "confidence": 0.9, "data": {"searchTerm": "ABC"}}

입력: "스타트업X 현황 알려줘"
출력: {"intent": "query_client", "confidence": 0.9, "data": {"searchTerm": "스타트업X"}}

### 조회 - 프로젝트
입력: "진행중인 프로젝트 뭐 있어?"
출력: {"intent": "query_project", "confidence": 0.9, "data": {"status": "IN_PROGRESS"}}

입력: "12월 캠페인 프로젝트 어떻게 돼?"
출력: {"intent": "query_project", "confidence": 0.85, "data": {"searchTerm": "12월 캠페인"}}

### 조회 - 정산
입력: "정산 대기 목록 보여줘"
출력: {"intent": "query_settlement", "confidence": 0.95, "data": {"status": "PENDING"}}

입력: "김민수 정산 했어?"
출력: {"intent": "query_settlement", "confidence": 0.9, "data": {"searchTerm": "김민수"}}

입력: "이번달 미정산 얼마야?"
출력: {"intent": "query_settlement", "confidence": 0.9, "data": {"status": "PENDING"}}

### 조회 - 지출
입력: "이번달 인플루언서 비용 총 얼마야?"
출력: {"intent": "query_spending", "confidence": 0.95, "data": {"period": "this_month", "category": "INFLUENCER_FEE"}}

입력: "지난달 지출 분석해줘"
출력: {"intent": "query_spending", "confidence": 0.9, "data": {"period": "last_month"}}

### 조회 - 인플루언서
입력: "뷰티 인플루언서 누구 있어?"
출력: {"intent": "query_influencer", "confidence": 0.85, "data": {"searchTerm": "뷰티"}}

입력: "김민수 인플루언서 협업 이력"
출력: {"intent": "query_influencer", "confidence": 0.9, "data": {"searchTerm": "김민수"}}

### 리포트 생성
입력: "주간 리포트 보내줘"
출력: {"intent": "generate_report", "confidence": 0.95, "data": {"reportType": "weekly"}}

입력: "이번달 리포트 만들어"
출력: {"intent": "generate_report", "confidence": 0.9, "data": {"reportType": "monthly"}}

### 조회 - 일정/마감 (프로젝트/캘린더)
입력: "이번주 마감하는 일정 알려줘"
출력: {"intent": "query_schedule", "confidence": 0.95, "data": {"period": "this_week", "type": "deadline"}}

입력: "다음주에 미팅 있어?"
출력: {"intent": "query_schedule", "confidence": 0.9, "data": {"period": "next_week", "type": "meeting"}}

입력: "내일 일정"
출력: {"intent": "query_schedule", "confidence": 0.95, "data": {"period": "tomorrow", "type": "all"}}

입력: "이번달 프로젝트 마감"
출력: {"intent": "query_schedule", "confidence": 0.9, "data": {"period": "this_month", "type": "deadline"}}

### 조회 - 팀 Todo (할일)
입력: "오늘 뭐해야해?"
출력: {"intent": "query_todo", "confidence": 0.95, "data": {}}

입력: "Todo 를 보고 최은성이 뭐해야되는지 알려줘"
출력: {"intent": "query_todo", "confidence": 0.95, "data": {"memberName": "최은성"}}

입력: "내 할일 뭐있어?"
출력: {"intent": "query_todo", "confidence": 0.9, "data": {}}

입력: "김철수가 해야할 작업 알려줘"
출력: {"intent": "query_todo", "confidence": 0.95, "data": {"memberName": "김철수"}}

입력: "팀 투두 현황"
출력: {"intent": "query_todo", "confidence": 0.9, "data": {}}

### 상태 업데이트
입력: "ABC 프로젝트 완료 처리해줘"
출력: {"intent": "update_status", "confidence": 0.95, "data": {"targetType": "project", "searchTerm": "ABC", "newStatus": "COMPLETED"}}

입력: "김민수 정산 완료했어"
출력: {"intent": "update_status", "confidence": 0.9, "data": {"targetType": "settlement", "searchTerm": "김민수", "newStatus": "COMPLETED"}}

입력: "뷰티 캠페인 진행중으로 바꿔줘"
출력: {"intent": "update_status", "confidence": 0.9, "data": {"targetType": "project", "searchTerm": "뷰티 캠페인", "newStatus": "IN_PROGRESS"}}

### 통합 검색
입력: "최근에 진행한 뷰티 캠페인 뭐 있었지?"
출력: {"intent": "smart_search", "confidence": 0.9, "data": {"searchTerm": "뷰티 캠페인", "searchType": "project"}}

입력: "작년에 협업한 인플루언서 찾아줘"
출력: {"intent": "smart_search", "confidence": 0.85, "data": {"searchTerm": "작년 협업", "searchType": "influencer"}}

입력: "지난달 광고비 지출 어디있어?"
출력: {"intent": "smart_search", "confidence": 0.85, "data": {"searchTerm": "광고비", "searchType": "transaction"}}

### 후속 질문
입력: "더 자세히 알려줘"
출력: {"intent": "follow_up", "confidence": 0.9, "data": {"followUpType": "detail"}}

입력: "지난달은?"
출력: {"intent": "follow_up", "confidence": 0.85, "data": {"followUpType": "compare", "context": "지난달"}}

입력: "다른 거 더 보여줘"
출력: {"intent": "follow_up", "confidence": 0.8, "data": {"followUpType": "extend"}}

**핵심 판단 기준:**
- 금액+동작(썼다/입금) → add_transaction
- 날짜+일정/미팅+등록 → add_calendar
- 인플루언서+추가/등록 → add_influencer (모든 필드 추출)
- [이름/회사명]+정보/현황/정산 → query_* (조회)
- 전체 현황/통계 → query_dashboard
- 정산+대기/현황 → query_settlement
- 지출+분석/카테고리 → query_spending
- 프로젝트 마감/일정/미팅 조회 → query_schedule
- Todo/할일/뭐해야해/작업 → query_todo
- 완료/상태변경/~했어 → update_status
- 찾아줘/검색/어디있어 → smart_search
- 더 자세히/그거/아까 → follow_up
- 리포트/보고서 → generate_report`;
}

// 자연어 파싱 함수
export async function parseNaturalLanguage(text: string): Promise<ParsedResult> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: getSystemPrompt() },
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
