-- Real per-user notifications for reactions and comments on your own posts.
-- Additive only: no existing rows are changed or deleted.
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "user_id"       TEXT NOT NULL,
  "type"          VARCHAR(20) NOT NULL,
  "post_id"       TEXT NOT NULL,
  "actor_id"      TEXT,
  "reaction_type" VARCHAR(20),
  "preview"       VARCHAR(240),
  "read_at"       TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
