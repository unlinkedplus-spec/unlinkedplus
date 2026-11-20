-- Migration: 20261121140000_add_spill_mode
-- Spill Without Judgment. Adds one optional-by-behaviour mode column so the
-- author can choose how readers should respond. Every existing post is treated
-- as "listen" (the safest, no-pressure default).
-- DATA-PRESERVING: one ADD COLUMN with a default and a CHECK. No row is deleted
-- or rewritten, and no existing value becomes invalid.

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "spill_mode" VARCHAR(20) NOT NULL DEFAULT 'listen';

ALTER TABLE "posts"
  DROP CONSTRAINT IF EXISTS "posts_spill_mode_check";

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_spill_mode_check"
  CHECK ("spill_mode" IN ('listen', 'advice', 'laugh', 'share'));
