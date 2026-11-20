-- Index untuk query panas yang sudah ada di aplikasi.
--
-- reactions: agregasi per post + tipe (dipakai reactionCountsByPost).
-- transactions: pencarian order pending per user+item (dipakai StoreService.purchase).
--
-- IF NOT EXISTS membuat migrasi ini aman dijalankan ulang secara manual
-- (mis. saat baseline database lama yang dibuat dengan `prisma db push`).

CREATE INDEX IF NOT EXISTS "Reaction_postId_reactionType_idx"
  ON "reactions"("post_id", "reaction_type");

CREATE INDEX IF NOT EXISTS "Transaction_userId_itemId_paymentStatus_idx"
  ON "transactions"("user_id", "item_id", "payment_status");
