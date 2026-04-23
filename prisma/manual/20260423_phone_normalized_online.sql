-- Online rollout for phone_normalized and appointment timeline indexes.
-- Safe to run before marking the Prisma migration as applied.

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "phone_normalized" TEXT;

DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  LOOP
    WITH batch AS (
      SELECT ctid
      FROM "profiles"
      WHERE "phone" IS NOT NULL
        AND "phone_normalized" IS NULL
      LIMIT 5000
    )
    UPDATE "profiles" p
    SET "phone_normalized" = NULLIF(
      regexp_replace(COALESCE(p."phone", ''), '\\D', '', 'g'),
      ''
    )
    FROM batch
    WHERE p.ctid = batch.ctid;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "profiles_phone_normalized_idx"
ON "profiles"("phone_normalized");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "appointments_client_id_date_idx"
ON "appointments"("client_id", "date" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "appointments_guest_client_id_date_idx"
ON "appointments"("guest_client_id", "date" DESC);
