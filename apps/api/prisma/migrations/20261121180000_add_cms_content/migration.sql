-- CMS: stable keys + ordering for landing feature content, and global settings.
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(80);
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "contents_slug_key" ON "contents"("slug");

CREATE TABLE IF NOT EXISTS "settings" (
  "key" VARCHAR(80) NOT NULL PRIMARY KEY,
  "value" JSONB NOT NULL
);

INSERT INTO "settings" ("key", "value")
VALUES ('ads', '{"adsEnabled":true,"maxPerSession":5}'::jsonb)
ON CONFLICT ("key") DO NOTHING;

-- Seeded from the approved landing mockup. Editing these rows changes the
-- feature pages and (when custom copy is set) the landing overlay labels.
INSERT INTO "contents" ("id", "slug", "title", "type", "body", "status", "sort_order", "updated_at") VALUES
  (gen_random_uuid()::text, 'spill', 'Spill Without Judgment', 'feature', 'Bercerita jujur tanpa takut dihakimi.', 'published', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'same-boat', 'Same Boat', 'feature', 'Temukan cerita dari orang yang mengalami situasi serupa. Tanpa identitas asli.', 'published', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'mental-armor', 'Mental Armor', 'feature', 'Apresiasi ketahanan dan proses. Bukan popularitas, bukan peringkat.', 'published', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'comeback-journey', 'Comeback Journey', 'feature', 'Jurnal bangkit yang privat. Tidak perlu memamerkan hasil.', 'published', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'toko', 'Avatar & Store', 'feature', 'Ekspresikan diri dengan aksesori. Pembayaran masih simulasi.', 'published', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'unlinked-rooms', 'Unlinked Rooms', 'feature', 'Komunitas dengan topik spesifik, bukan kompetisi followers.', 'published', 6, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'support-circles', 'Support Circles', 'feature', 'Kelompok dukungan kecil untuk saling mendengar.', 'published', 7, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'dear-future-me', 'Dear Future Me', 'feature', 'Surat untuk diri di masa depan, dibuka sesuai jadwalmu.', 'published', 8, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'tiny-wins', 'Tiny Wins', 'feature', 'Tantangan kecil yang bisa diselesaikan dalam sehari.', 'published', 9, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'hall-of-almost', 'Hall of Almost', 'feature', 'Galeri penghargaan untuk usaha yang belum berhasil.', 'published', 10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'mental-reset', 'Mental Reset', 'feature', 'Jeda sebentar untuk mengisi ulang energi. Bukan penanganan medis.', 'published', 11, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
