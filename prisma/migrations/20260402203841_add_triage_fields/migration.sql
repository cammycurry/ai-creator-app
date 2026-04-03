-- AlterTable
ALTER TABLE "ReferencePost" ADD COLUMN     "triageLabel" TEXT,
ADD COLUMN     "triageStarred" BOOLEAN NOT NULL DEFAULT false;
