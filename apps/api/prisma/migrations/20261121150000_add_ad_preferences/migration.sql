-- Migration: 20261121150000_add_ad_preferences
-- SEC-04. Adds user-controlled advertising preferences with a safe default.
-- DATA-PRESERVING: one additive column with a default. No row is deleted or rewritten.

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "ad_preferences" JSONB
  NOT NULL DEFAULT '{"adsEnabled":true,"maxPerSession":5}'::jsonb;
