-- Add indexes introduced in schema.prisma but not yet represented
-- in a deployable Prisma migration.

CREATE INDEX IF NOT EXISTS "profiles_role_idx"
  ON "profiles"("role");

CREATE INDEX IF NOT EXISTS "loyalty_accounts_referred_by_id_idx"
  ON "loyalty_accounts"("referred_by_id");

CREATE INDEX IF NOT EXISTS "point_transactions_loyalty_account_id_created_at_idx"
  ON "point_transactions"("loyalty_account_id", "created_at");

CREATE INDEX IF NOT EXISTS "point_transactions_expires_at_idx"
  ON "point_transactions"("expires_at");
