-- Fix drift: AdminMedia columns already exist in DB but weren't in migrations
-- This migration is a no-op baseline — the columns are already present
-- (They were added via direct DB alter or an untracked migration)

-- These columns already exist; adding IF NOT EXISTS guards
ALTER TABLE "AdminMedia" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
ALTER TABLE "AdminMedia" ADD COLUMN IF NOT EXISTS "promptTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AdminMedia" ADD COLUMN IF NOT EXISTS "rating" INTEGER;

-- Index already exists in DB
CREATE INDEX IF NOT EXISTS "AdminMedia_rating_idx" ON "AdminMedia"("rating");
