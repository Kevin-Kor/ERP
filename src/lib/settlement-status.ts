import { z } from "zod";

// 인플루언서 정산(ProjectInfluencer.paymentStatus) 상태값의 단일 기준.
// DB에는 항상 대문자 PENDING / REQUESTED / COMPLETED로 저장한다.
// (과거에는 화면마다 pending/in_progress/completed 소문자와 섞여 저장되었다.
//  prisma/migrations/20261029000100_normalize_settlement_status 에서 정리)

export const SETTLEMENT_STATUSES = ["PENDING", "REQUESTED", "COMPLETED"] as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

// 아직 정산이 끝나지 않은 상태
export const OPEN_SETTLEMENT_STATUSES: SettlementStatus[] = ["PENDING", "REQUESTED"];

// 과거 값(in_progress 등)과 대소문자 차이를 허용해 해석한다. 알 수 없는 값이면 null.
export function parseSettlementStatus(value: unknown): SettlementStatus | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  if (upper === "PENDING") return "PENDING";
  if (upper === "REQUESTED" || upper === "IN_PROGRESS") return "REQUESTED";
  if (upper === "COMPLETED") return "COMPLETED";
  return null;
}

// 화면 표시·집계용. 알 수 없는 값은 미정산(PENDING)으로 본다.
export function normalizeSettlementStatus(value: unknown): SettlementStatus {
  return parseSettlementStatus(value) ?? "PENDING";
}

// API 입력 검증용: 비어 있으면 PENDING, 알 수 없는 값이면 400
export const settlementStatusInput = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return "PENDING" as const;
    const status = parseSettlementStatus(value);
    if (!status) {
      ctx.addIssue({ code: "custom", message: `Unknown paymentStatus: ${value}` });
      return z.NEVER;
    }
    return status;
  });
