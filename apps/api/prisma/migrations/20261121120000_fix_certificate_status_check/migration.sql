-- Migration: 20261121120000_fix_certificate_status_check
-- C4 remediation. The earlier add_indexes migration created a CHECK that only
-- allowed 'done', but the certificate worker writes status 'ready'
-- (src/worker/certificate.processor.ts) and the service/download path expects
-- 'ready'. On any database that actually ran that migration, the worker UPDATE
-- is rejected and certificates can never become downloadable.
--
-- This migration is DATA-PRESERVING: it only replaces the constraint definition.
-- Both 'ready' (the value the application uses) and the legacy 'done' are
-- accepted so no existing row can violate the new constraint.

ALTER TABLE "certificates"
  DROP CONSTRAINT IF EXISTS "certificates_status_check";

ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_status_check"
  CHECK ("status" IN ('pending', 'processing', 'ready', 'done', 'failed'));
