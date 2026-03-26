-- Fix rebooking drift: ensure cancelled appointments do NOT block the same slot.
--
-- Some environments may still have a global UNIQUE index on (barber_id, date, start_time),
-- either with the baseline name or a different name (drift).
-- That UNIQUE index causes Prisma P2002 even when the existing appointment is cancelled.
--
-- This migration:
-- - Drops any UNIQUE index on appointments(barber_id, date, start_time) that is NOT the
--   partial unique index for confirmed slots.
-- - Ensures the partial unique index exists (status = 'CONFIRMED').
-- - Ensures a non-unique index exists for query performance.

-- Keep a regular (non-unique) index for range queries / listings.
CREATE INDEX IF NOT EXISTS "appointments_barber_id_date_start_time_idx"
ON "appointments" ("barber_id", "date", "start_time");

-- Drop any drifting UNIQUE index on (barber_id, date, start_time) that blocks rebooking.
-- We exclude partial indexes (indpred IS NOT NULL) to preserve the confirmed-only index.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      i.relname AS index_name,
      pg_get_indexdef(idx.indexrelid) AS index_def
    FROM pg_index idx
    JOIN pg_class i ON i.oid = idx.indexrelid
    JOIN pg_class t ON t.oid = idx.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE
      n.nspname = 'public'
      AND t.relname = 'appointments'
      AND idx.indisunique = true
      AND idx.indpred IS NULL  -- Exclude partial indexes (with WHERE clause)
      AND pg_get_indexdef(idx.indexrelid) LIKE '%(barber_id, date, start_time)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.index_name);
  END LOOP;
END $$;

-- Enforce uniqueness ONLY for active (confirmed) appointments.
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_unique_confirmed_slot"
ON "appointments" ("barber_id", "date", "start_time")
WHERE "status" = 'CONFIRMED';


