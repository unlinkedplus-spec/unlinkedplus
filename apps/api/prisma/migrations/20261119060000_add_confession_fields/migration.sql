-- Migration: 20261119060000_add_confession_fields
-- Add confession support to posts table

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "is_confession" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "is_anonymous" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "posts_is_confession_status_scheduled_at_idx"
  ON "posts"("is_confession", "status", "scheduled_at");
