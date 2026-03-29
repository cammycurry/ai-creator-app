-- AlterEnum
ALTER TYPE "ContentSource" ADD VALUE 'CAROUSEL';

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "contentSetId" TEXT,
ADD COLUMN     "slideContext" JSONB,
ADD COLUMN     "slideIndex" INTEGER;

-- CreateTable
CREATE TABLE "ContentSet" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "formatId" TEXT,
    "caption" TEXT,
    "hashtags" TEXT[],
    "slideCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "creditsCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentSet_creatorId_idx" ON "ContentSet"("creatorId");

-- CreateIndex
CREATE INDEX "ContentSet_userId_idx" ON "ContentSet"("userId");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_contentSetId_fkey" FOREIGN KEY ("contentSetId") REFERENCES "ContentSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSet" ADD CONSTRAINT "ContentSet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSet" ADD CONSTRAINT "ContentSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
