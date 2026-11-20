-- Migration: 20261119030000_add_polls
-- Office Survival Poll: polls, options, and one-vote-per-user votes.

CREATE TABLE IF NOT EXISTS "polls" (
  "id"         TEXT         NOT NULL,
  "question"   VARCHAR(200) NOT NULL,
  "status"     VARCHAR(20)  NOT NULL DEFAULT 'active',
  "starts_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at"    TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "poll_options" (
  "id"       TEXT         NOT NULL,
  "poll_id"  TEXT         NOT NULL,
  "label"    VARCHAR(120) NOT NULL,
  "position" INTEGER      NOT NULL,
  CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id")
    REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id"         TEXT         NOT NULL,
  "poll_id"    TEXT         NOT NULL,
  "option_id"  TEXT         NOT NULL,
  "user_id"    TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id")
    REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "poll_votes_option_id_fkey" FOREIGN KEY ("option_id")
    REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "poll_votes_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "poll_options_poll_id_position_key"
  ON "poll_options"("poll_id", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "poll_votes_poll_id_user_id_key"
  ON "poll_votes"("poll_id", "user_id");
CREATE INDEX IF NOT EXISTS "poll_votes_option_id_idx" ON "poll_votes"("option_id");
CREATE INDEX IF NOT EXISTS "polls_status_ends_at_idx" ON "polls"("status", "ends_at");
