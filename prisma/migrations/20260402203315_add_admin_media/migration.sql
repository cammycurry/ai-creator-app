-- CreateTable
CREATE TABLE "AdminMedia" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "prompt" TEXT,
    "notes" TEXT,
    "sourceHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminMedia_s3Key_key" ON "AdminMedia"("s3Key");

-- CreateIndex
CREATE INDEX "AdminMedia_label_idx" ON "AdminMedia"("label");

-- CreateIndex
CREATE INDEX "AdminMedia_starred_idx" ON "AdminMedia"("starred");
