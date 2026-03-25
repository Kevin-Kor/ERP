-- AlterTable: Add missing columns to Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "monthlyFee" DOUBLE PRECISION;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isFixedVendor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add missing columns to CalendarEvent
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);

-- AlterTable: Add missing columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleSyncEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientVisit" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientMemo" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamTodoColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTodoColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamTodoMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTodoMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarEvent_googleEventId_key" ON "CalendarEvent"("googleEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarEvent_date_idx" ON "CalendarEvent"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_endDate_idx" ON "Project"("endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectInfluencer_paymentStatus_idx" ON "ProjectInfluencer"("paymentStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectInfluencer_paymentDueDate_idx" ON "ProjectInfluencer"("paymentDueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_date_type_idx" ON "Transaction"("date", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_type_paymentStatus_idx" ON "Transaction"("type", "paymentStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_clientId_idx" ON "Transaction"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_projectId_idx" ON "Transaction"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientVisit_clientId_idx" ON "ClientVisit"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientVisit_date_idx" ON "ClientVisit"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientPayment_clientId_idx" ON "ClientPayment"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientPayment_clientId_month_key" ON "ClientPayment"("clientId", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientVideo_clientId_idx" ON "ClientVideo"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientMemo_clientId_key" ON "ClientMemo"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamTodoTask_memberId_columnIndex_idx" ON "TeamTodoTask"("memberId", "columnIndex");

-- AddForeignKey
ALTER TABLE "ClientVisit" ADD CONSTRAINT "ClientVisit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientVideo" ADD CONSTRAINT "ClientVideo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMemo" ADD CONSTRAINT "ClientMemo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTodoTask" ADD CONSTRAINT "TeamTodoTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamTodoMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
