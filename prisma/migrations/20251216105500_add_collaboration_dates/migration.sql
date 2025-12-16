-- AlterTable
ALTER TABLE "ProjectInfluencer" ADD COLUMN "shootingDate" TIMESTAMP(3);
ALTER TABLE "ProjectInfluencer" ADD COLUMN "draftDeliveryDate" TIMESTAMP(3);
ALTER TABLE "ProjectInfluencer" ADD COLUMN "uploadDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ProjectInfluencer_shootingDate_idx" ON "ProjectInfluencer"("shootingDate");
