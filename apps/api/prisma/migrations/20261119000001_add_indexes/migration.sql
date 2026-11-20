-- Migration: 20261119000001_add_indexes
-- Adds performance indexes and CHECK constraints for data-integrity enforcement.
-- IF NOT EXISTS guards make all statements safe to re-run.

-- Index: certificates.status (worker polls pending jobs by status)
CREATE INDEX IF NOT EXISTS "certificates_status_idx" ON "certificates"("status");

-- Index: transactions.user_id + payment_status (my-transactions queries)
CREATE INDEX IF NOT EXISTS "transactions_user_id_payment_status_idx"
  ON "transactions"("user_id", "payment_status");

-- Index: transactions.created_at (admin dashboard time-range queries)
CREATE INDEX IF NOT EXISTS "transactions_created_at_idx"
  ON "transactions"("created_at");

-- NOTE: media table will be created in 20261119040000_add_cms_tables.
-- Index: media.mime_type + created_at will be created there.

-- CHECK constraints to prevent invalid status/role values being inserted
ALTER TABLE "users"
  ADD CONSTRAINT "users_role_check"
  CHECK ("role" IN ('user', 'admin', 'moderator'));

ALTER TABLE "users"
  ADD CONSTRAINT "users_status_check"
  CHECK ("status" IN ('active', 'disabled', 'banned'));

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_status_check"
  CHECK ("status" IN ('active', 'deleted', 'hidden'));

ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_status_check"
  CHECK ("status" IN ('pending', 'processing', 'done', 'failed'));

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_payment_status_check"
  CHECK ("payment_status" IN ('pending', 'simulated', 'failed', 'refunded'));

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_status_check"
  CHECK ("status" IN ('pending', 'dismissed', 'resolved'));
