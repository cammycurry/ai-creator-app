-- Fix drift: AdminMedia table changes already applied directly to DB
ALTER TABLE "AdminMedia" ADD COLUMN IF NOT EXISTS "mediaType" TEXT NOT NULL DEFAULT 'creator';
ALTER TABLE "AdminMedia" ADD COLUMN IF NOT EXISTS "pipelineOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdminMedia" ADD COLUMN IF NOT EXISTS "pipelineStage" TEXT NOT NULL DEFAULT 'inbox';
ALTER TABLE "AdminMedia" DROP COLUMN IF EXISTS "label";
DROP INDEX IF EXISTS "AdminMedia_label_idx";
CREATE INDEX IF NOT EXISTS "AdminMedia_mediaType_idx" ON "AdminMedia"("mediaType");
CREATE INDEX IF NOT EXISTS "AdminMedia_pipelineStage_idx" ON "AdminMedia"("pipelineStage");

-- Fix drift: ReferencePost table changes already applied directly to DB
ALTER TABLE "ReferencePost" ADD COLUMN IF NOT EXISTS "triageLabels" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ReferencePost" DROP COLUMN IF EXISTS "triageLabel";

-- CreateTable: ContentTemplate
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "sourceVideoUrl" TEXT,
    "category" TEXT NOT NULL,
    "trend" TEXT NOT NULL,
    "tags" TEXT[],
    "generationConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentTemplate_category_idx" ON "ContentTemplate"("category");

-- CreateIndex
CREATE INDEX "ContentTemplate_trend_idx" ON "ContentTemplate"("trend");

-- CreateIndex
CREATE INDEX "ContentTemplate_type_idx" ON "ContentTemplate"("type");

-- CreateIndex
CREATE INDEX "ContentTemplate_isActive_popularity_idx" ON "ContentTemplate"("isActive", "popularity");
