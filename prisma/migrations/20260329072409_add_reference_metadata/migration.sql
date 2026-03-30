-- AlterTable
ALTER TABLE "ReferenceAccount" ADD COLUMN     "categoryName" TEXT,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "isBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ReferencePost" ADD COLUMN     "altText" TEXT,
ADD COLUMN     "commentCount" INTEGER,
ADD COLUMN     "likeCount" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "viewCount" INTEGER;
