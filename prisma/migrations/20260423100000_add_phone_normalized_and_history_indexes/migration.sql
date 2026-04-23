-- Add normalized phone column for indexed lookups on registered profiles.
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "phone_normalized" TEXT;

-- Backfill existing records with digits-only format; keep empty as NULL.
UPDATE "profiles"
SET "phone_normalized" = NULLIF(
  regexp_replace(COALESCE("phone", ''), '\D', '', 'g'),
  ''
);

-- Support direct banned-phone lookup by normalized phone.
CREATE INDEX IF NOT EXISTS "profiles_phone_normalized_idx"
ON "profiles"("phone_normalized");

-- Support timeline queries by client/guest ordered by date.
CREATE INDEX IF NOT EXISTS "appointments_client_id_date_idx"
ON "appointments"("client_id", "date" DESC);

CREATE INDEX IF NOT EXISTS "appointments_guest_client_id_date_idx"
ON "appointments"("guest_client_id", "date" DESC);
