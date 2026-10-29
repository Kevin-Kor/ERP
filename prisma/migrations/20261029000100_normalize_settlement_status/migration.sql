-- 정산 상태값 통일: 화면마다 소문자(pending/in_progress/completed)와 대문자가 섞여 저장된 값을
-- 대문자 PENDING / REQUESTED / COMPLETED로 맞춘다. (기준: src/lib/settlement-status.ts)
--
-- 안전 장치
--   - 행을 삭제하지 않고 paymentStatus 값만 바꾼다.
--   - 이미 대문자인 행은 건드리지 않는다 (WHERE ... <> 대상값).
--   - 알 수 없는 값(위 별칭에 해당하지 않는 값)은 그대로 둔다. 배포 전 확인 쿼리는 PR 설명 참고.
--   - updatedAt은 바꾸지 않는다 (사용자 수정이 아니라 표기 정리이므로).
--   - 여러 번 실행해도 결과가 같다.

-- 인플루언서 정산 (ProjectInfluencer)
UPDATE "ProjectInfluencer"
SET "paymentStatus" = 'PENDING'
WHERE "paymentStatus" <> 'PENDING'
  AND UPPER(TRIM("paymentStatus")) = 'PENDING';

UPDATE "ProjectInfluencer"
SET "paymentStatus" = 'REQUESTED'
WHERE "paymentStatus" <> 'REQUESTED'
  AND UPPER(TRIM("paymentStatus")) IN ('REQUESTED', 'IN_PROGRESS');

UPDATE "ProjectInfluencer"
SET "paymentStatus" = 'COMPLETED'
WHERE "paymentStatus" <> 'COMPLETED'
  AND UPPER(TRIM("paymentStatus")) = 'COMPLETED';

-- 거래 (Transaction) — 같은 이름의 컬럼, 값은 PENDING / COMPLETED
UPDATE "Transaction"
SET "paymentStatus" = 'PENDING'
WHERE "paymentStatus" <> 'PENDING'
  AND UPPER(TRIM("paymentStatus")) = 'PENDING';

UPDATE "Transaction"
SET "paymentStatus" = 'COMPLETED'
WHERE "paymentStatus" <> 'COMPLETED'
  AND UPPER(TRIM("paymentStatus")) = 'COMPLETED';
