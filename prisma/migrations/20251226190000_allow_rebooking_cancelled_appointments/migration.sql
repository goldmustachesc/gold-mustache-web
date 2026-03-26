-- Allow rebooking a slot after cancellation.
-- Previously, a global unique index on (barber_id, date, start_time) prevented
-- a new appointment from being created even when the old one was cancelled.

-- Drop the global unique index created in the baseline migration.
DROP INDEX IF EXISTS "appointments_barber_id_date_start_time_key";

-- Keep a regular (non-unique) index for range queries / listings.
CREATE INDEX IF NOT EXISTS "appointments_barber_id_date_start_time_idx"
ON "appointments" ("barber_id", "date", "start_time");

-- Enforce uniqueness ONLY for active (confirmed) appointments.
-- This preserves history (cancelled/completed) without blocking new bookings.
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_unique_confirmed_slot"
ON "appointments" ("barber_id", "date", "start_time")
WHERE "status" = 'CONFIRMED';


