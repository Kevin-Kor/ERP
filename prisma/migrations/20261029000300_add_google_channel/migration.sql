-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleChannelExpiry" TIMESTAMP(3),
ADD COLUMN     "googleChannelId" TEXT,
ADD COLUMN     "googleChannelResourceId" TEXT,
ADD COLUMN     "googleChannelToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleChannelId_key" ON "User"("googleChannelId");

