-- Add CHECK constraint to ensure appointments have at least one client identifier
-- This prevents "orphan" appointments with no associated client (registered or guest)

ALTER TABLE "appointments" ADD CONSTRAINT "appointment_client_check"
    CHECK ("client_id" IS NOT NULL OR "guest_client_id" IS NOT NULL);

