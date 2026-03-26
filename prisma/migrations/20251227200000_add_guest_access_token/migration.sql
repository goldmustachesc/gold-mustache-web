-- Add access_token column to guest_clients table for secure device-bound sessions
ALTER TABLE "guest_clients" ADD COLUMN "access_token" TEXT;

-- Create unique index on access_token (allows NULL values, only enforces uniqueness on non-NULL)
CREATE UNIQUE INDEX "guest_clients_access_token_key" ON "guest_clients"("access_token");

-- Generate access tokens for existing guest clients (optional but ensures consistency)
UPDATE "guest_clients"
SET "access_token" = gen_random_uuid()::text
WHERE "access_token" IS NULL;

