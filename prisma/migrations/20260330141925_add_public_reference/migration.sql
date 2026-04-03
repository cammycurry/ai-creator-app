-- CreateTable
CREATE TABLE "PublicReference" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "tags" TEXT[],
    "category" TEXT NOT NULL,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourcePostId" TEXT,
    "curatedBy" TEXT,
    "generationPrompt" TEXT,
    "generationModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicReference_type_idx" ON "PublicReference"("type");

-- CreateIndex
CREATE INDEX "PublicReference_category_idx" ON "PublicReference"("category");

-- CreateIndex
CREATE INDEX "PublicReference_isActive_idx" ON "PublicReference"("isActive");

-- AddForeignKey
ALTER TABLE "PublicReference" ADD CONSTRAINT "PublicReference_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "ReferencePost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
