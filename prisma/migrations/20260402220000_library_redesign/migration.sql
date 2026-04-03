-- DropIndex
DROP INDEX "Reference_creatorId_idx";

-- AlterTable
ALTER TABLE "Reference" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'UPLOAD',
ADD COLUMN     "sourcePublicRefId" TEXT,
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "creatorId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Reference_userId_starred_idx" ON "Reference"("userId", "starred");

-- CreateIndex
CREATE INDEX "Reference_userId_lastUsedAt_idx" ON "Reference"("userId", "lastUsedAt");
