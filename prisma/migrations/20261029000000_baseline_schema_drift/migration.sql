-- 베이스라인: 마이그레이션 없이(prisma db push 등으로) 운영 DB에 먼저 반영된 스키마 변경을 기록한다.
--
-- 운영 DB에는 아래 객체가 이미 있을 수 있으므로 모든 구문을 "없을 때만 생성"으로 작성했다.
--   - 이미 있는 DB: 아무것도 바꾸지 않고 통과 (데이터 변경/삭제 없음)
--   - 새 DB: 현재 schema.prisma와 동일한 구조가 만들어짐
-- Postgres는 ADD CONSTRAINT IF NOT EXISTS를 지원하지 않아 외래키는 pg_constraint를 확인한다.

-- ---------------------------------------------------------------------------
-- 기존 테이블에 추가된 컬럼
-- ---------------------------------------------------------------------------
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isFixedVendor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "monthlyFee" DOUBLE PRECISION;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleSyncEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- 클라이언트 관리 기록
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ClientVisit" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientPayment" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "deposit" BOOLEAN NOT NULL DEFAULT false,
    "balance" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" TIMESTAMP(3),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientVideo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientMemo" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientMemo_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 팀 To-Do
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TeamTodoColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTodoColumn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamTodoMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTodoMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamTodoTask" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "columnIndex" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "TeamTodoTask_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 인덱스
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ClientVisit_clientId_idx" ON "ClientVisit"("clientId");
CREATE INDEX IF NOT EXISTS "ClientVisit_date_idx" ON "ClientVisit"("date");
CREATE INDEX IF NOT EXISTS "ClientPayment_clientId_idx" ON "ClientPayment"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientPayment_clientId_month_key" ON "ClientPayment"("clientId", "month");
CREATE INDEX IF NOT EXISTS "ClientVideo_clientId_idx" ON "ClientVideo"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientMemo_clientId_key" ON "ClientMemo"("clientId");
CREATE INDEX IF NOT EXISTS "TeamTodoTask_memberId_columnIndex_idx" ON "TeamTodoTask"("memberId", "columnIndex");
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarEvent_googleEventId_key" ON "CalendarEvent"("googleEventId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_date_idx" ON "CalendarEvent"("date");
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");
CREATE INDEX IF NOT EXISTS "Project_endDate_idx" ON "Project"("endDate");
CREATE INDEX IF NOT EXISTS "Project_clientId_idx" ON "Project"("clientId");
CREATE INDEX IF NOT EXISTS "ProjectInfluencer_paymentStatus_idx" ON "ProjectInfluencer"("paymentStatus");
CREATE INDEX IF NOT EXISTS "ProjectInfluencer_paymentDueDate_idx" ON "ProjectInfluencer"("paymentDueDate");
CREATE INDEX IF NOT EXISTS "Transaction_date_type_idx" ON "Transaction"("date", "type");
CREATE INDEX IF NOT EXISTS "Transaction_type_paymentStatus_idx" ON "Transaction"("type", "paymentStatus");
CREATE INDEX IF NOT EXISTS "Transaction_clientId_idx" ON "Transaction"("clientId");
CREATE INDEX IF NOT EXISTS "Transaction_projectId_idx" ON "Transaction"("projectId");

-- ---------------------------------------------------------------------------
-- 외래키
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientVisit_clientId_fkey') THEN
        ALTER TABLE "ClientVisit" ADD CONSTRAINT "ClientVisit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientPayment_clientId_fkey') THEN
        ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientVideo_clientId_fkey') THEN
        ALTER TABLE "ClientVideo" ADD CONSTRAINT "ClientVideo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientMemo_clientId_fkey') THEN
        ALTER TABLE "ClientMemo" ADD CONSTRAINT "ClientMemo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamTodoTask_memberId_fkey') THEN
        ALTER TABLE "TeamTodoTask" ADD CONSTRAINT "TeamTodoTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamTodoMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
