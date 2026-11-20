-- Migration: 20261121130000_allow_scheduled_posts
-- H2 remediation. ConfessionsService.create() writes status='scheduled' for
-- future-dated posts, but the CHECK created in 20261119000001_add_indexes only
-- allowed ('active','deleted','hidden'), so every scheduled confession failed
-- at INSERT. This migration widens the constraint instead of deleting rows.
-- DATA-PRESERVING: only a constraint definition and an index are changed.

ALTER TABLE "posts"
  DROP CONSTRAINT IF EXISTS "posts_status_check";

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_status_check"
  CHECK ("status" IN ('active', 'scheduled', 'deleted', 'hidden'));

-- Supports the worker's frequent "due scheduled posts" scan without indexing
-- the whole posts table.
CREATE INDEX IF NOT EXISTS "posts_scheduled_due_idx"
  ON "posts"("scheduled_at")
  WHERE "status" = 'scheduled';
