-- CreateTable
CREATE TABLE "SlackEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlackEvent_createdAt_idx" ON "SlackEvent"("createdAt");

