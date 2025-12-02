import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 금액 포맷팅 (한국 원화)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

// 만원 단위로 포맷팅
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 10000) {
    return `₩${(amount / 10000).toFixed(0)}만`;
  }
  return formatCurrency(amount);
}

// 날짜 포맷팅
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// 상대적 날짜 (D+일)
export function getDaysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  const diffTime = today.getTime() - d.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// 퍼센트 포맷팅
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// 문서 번호 생성
export function generateDocNumber(
  type: "QUOTE" | "TAX_INVOICE" | "CONTRACT",
  sequence: number
): string {
  const prefix = {
    QUOTE: "EST",
    TAX_INVOICE: "TAX",
    CONTRACT: "CON",
  }[type];
  
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq = String(sequence).padStart(3, "0");
  
  return `${prefix}-${yearMonth}-${seq}`;
}

// 상태 라벨 변환
export const STATUS_LABELS = {
  // Client status
  ACTIVE: "활성",
  DORMANT: "휴면",
  TERMINATED: "종료",
  // Project status
  QUOTING: "견적중",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  CANCELLED: "취소",
  // Payment status
  PENDING: "대기",
  REQUESTED: "요청됨",
  // Document status
  ISSUED: "발행",
  DELIVERED: "전달",
  ACCEPTED: "수락",
  REJECTED: "거절",
} as const;

// 상태별 색상
export const STATUS_COLORS = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  DORMANT: "bg-amber-100 text-amber-800",
  TERMINATED: "bg-gray-100 text-gray-800",
  QUOTING: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  PENDING: "bg-amber-100 text-amber-800",
  REQUESTED: "bg-blue-100 text-blue-800",
  ISSUED: "bg-gray-100 text-gray-800",
  DELIVERED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
} as const;

// 카테고리 라벨
export const REVENUE_CATEGORIES = [
  { value: "CAMPAIGN_FEE", label: "캠페인 대행료" },
  { value: "CONTENT_FEE", label: "콘텐츠 제작비" },
  { value: "CONSULTING", label: "컨설팅/기타" },
  { value: "OTHER_REVENUE", label: "기타 수익" },
] as const;

export const EXPENSE_CATEGORIES = [
  // 업무 관련
  { value: "INFLUENCER_FEE", label: "인플루언서 비용", group: "업무" },
  { value: "AD_SPEND", label: "광고비", group: "업무" },
  { value: "CONTENT_PRODUCTION", label: "콘텐츠 제작비", group: "업무" },
  // 운영/인건비
  { value: "OPERATIONS", label: "운영비", group: "운영" },
  { value: "SALARY", label: "인건비", group: "운영" },
  { value: "OFFICE_RENT", label: "임대료", group: "운영" },
  // 일반 지출
  { value: "FOOD", label: "식비", group: "일반" },
  { value: "TRANSPORTATION", label: "교통비", group: "일반" },
  { value: "COMMUNICATION", label: "통신비", group: "일반" },
  { value: "SUPPLIES", label: "소모품비", group: "일반" },
  { value: "ENTERTAINMENT", label: "접대비", group: "일반" },
  { value: "WELFARE", label: "복리후생비", group: "일반" },
  { value: "EDUCATION", label: "교육비", group: "일반" },
  { value: "SUBSCRIPTION", label: "구독료", group: "일반" },
  { value: "TAX", label: "세금/공과금", group: "일반" },
  { value: "OTHER", label: "기타", group: "일반" },
] as const;

// 그룹별 카테고리
export const EXPENSE_CATEGORY_GROUPS = {
  업무: EXPENSE_CATEGORIES.filter(c => c.group === "업무"),
  운영: EXPENSE_CATEGORIES.filter(c => c.group === "운영"),
  일반: EXPENSE_CATEGORIES.filter(c => c.group === "일반"),
} as const;

export const INDUSTRY_OPTIONS = [
  { value: "FOOD", label: "식음료" },
  { value: "BEAUTY", label: "뷰티" },
  { value: "FASHION", label: "패션" },
  { value: "OTHER", label: "기타" },
] as const;

export const PLATFORM_OPTIONS = [
  { value: "INSTAGRAM_REELS", label: "인스타그램 릴스" },
  { value: "YOUTUBE_SHORTS", label: "유튜브 쇼츠" },
  { value: "TIKTOK", label: "틱톡" },
  { value: "INSTAGRAM_FEED", label: "인스타그램 피드" },
  { value: "YOUTUBE", label: "유튜브 (일반)" },
  { value: "BLOG", label: "블로그" },
] as const;

export const CONTENT_TYPE_OPTIONS = [
  { value: "SHORTFORM", label: "숏폼 (60초 이하)" },
  { value: "MIDFORM", label: "미드폼 (1-3분)" },
  { value: "LONGFORM", label: "롱폼 (3분 이상)" },
  { value: "FEED", label: "피드 이미지" },
  { value: "STORY", label: "스토리" },
  { value: "CAROUSEL", label: "캐러셀" },
] as const;

// 숏폼 제작 단계
export const PRODUCTION_STAGES = [
  { value: "PLANNING", label: "기획", color: "#6366F1" },
  { value: "SCRIPTING", label: "대본 작성", color: "#8B5CF6" },
  { value: "SHOOTING", label: "촬영", color: "#EC4899" },
  { value: "EDITING", label: "편집", color: "#F59E0B" },
  { value: "REVIEW", label: "검수", color: "#3B82F6" },
  { value: "REVISION", label: "수정", color: "#EF4444" },
  { value: "APPROVED", label: "승인완료", color: "#10B981" },
  { value: "UPLOADED", label: "업로드 완료", color: "#059669" },
] as const;

// 숏폼 영상 스타일
export const VIDEO_STYLE_OPTIONS = [
  { value: "VLOG", label: "브이로그" },
  { value: "REVIEW", label: "리뷰/언박싱" },
  { value: "TUTORIAL", label: "튜토리얼" },
  { value: "CHALLENGE", label: "챌린지" },
  { value: "BEHIND", label: "비하인드" },
  { value: "INTERVIEW", label: "인터뷰" },
  { value: "CINEMATIC", label: "시네마틱" },
  { value: "COMEDY", label: "유머/코미디" },
  { value: "OTHER", label: "기타" },
] as const;

export const INFLUENCER_CATEGORIES = [
  { value: "FOOD", label: "맛집" },
  { value: "BEAUTY", label: "뷰티" },
  { value: "LIFESTYLE", label: "라이프스타일" },
  { value: "PARENTING", label: "육아" },
  { value: "TRAVEL", label: "여행" },
  { value: "FASHION", label: "패션" },
  { value: "TECH", label: "테크" },
  { value: "OTHER", label: "기타" },
] as const;


