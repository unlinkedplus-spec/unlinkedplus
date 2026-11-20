-- Defense in depth: saldo wallet tidak boleh negatif walau ada bug di layer aplikasi.
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_balance_nonnegative" CHECK ("balance" >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_pending_nonnegative" CHECK ("pending" >= 0);
