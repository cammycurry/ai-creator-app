-- CreateTable
CREATE TABLE "ReferenceAccount" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT,
    "bio" TEXT,
    "followers" INTEGER,
    "following" INTEGER,
    "postCount" INTEGER,
    "profilePicUrl" TEXT,
    "niche" TEXT[],
    "gender" TEXT,
    "vibe" TEXT,
    "quality" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferencePost" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shortcode" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "carouselIndex" INTEGER NOT NULL DEFAULT 0,
    "pose" TEXT,
    "setting" TEXT,
    "outfit" TEXT,
    "lighting" TEXT,
    "composition" TEXT,
    "quality" INTEGER,
    "isGoodReference" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferencePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceAccount_handle_key" ON "ReferenceAccount"("handle");

-- CreateIndex
CREATE INDEX "ReferencePost_accountId_idx" ON "ReferencePost"("accountId");

-- CreateIndex
CREATE INDEX "ReferencePost_shortcode_idx" ON "ReferencePost"("shortcode");

-- CreateIndex
CREATE UNIQUE INDEX "ReferencePost_shortcode_carouselIndex_key" ON "ReferencePost"("shortcode", "carouselIndex");

-- AddForeignKey
ALTER TABLE "ReferencePost" ADD CONSTRAINT "ReferencePost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ReferenceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
