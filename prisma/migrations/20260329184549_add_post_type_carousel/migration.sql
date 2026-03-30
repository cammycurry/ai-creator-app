-- AlterTable
ALTER TABLE "ReferencePost" ADD COLUMN     "carouselCount" INTEGER,
ADD COLUMN     "postType" TEXT NOT NULL DEFAULT 'single';
