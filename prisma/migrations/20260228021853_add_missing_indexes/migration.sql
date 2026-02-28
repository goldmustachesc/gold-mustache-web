-- Notification: composite for filtering by userId and unread-count queries.
-- The leftmost prefix (user_id) also satisfies standalone userId lookups.
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx"
  ON "notifications"("user_id", "read");

-- Appointment: "my appointments" queries filter by clientId
CREATE INDEX IF NOT EXISTS "appointments_client_id_idx"
  ON "appointments"("client_id");

-- Appointment: guest lookup queries filter by guestClientId
CREATE INDEX IF NOT EXISTS "appointments_guest_client_id_idx"
  ON "appointments"("guest_client_id");

-- Appointment: financial reports and listing queries filter by status
CREATE INDEX IF NOT EXISTS "appointments_status_idx"
  ON "appointments"("status");

-- CookieConsent: consent lookups for authenticated users
CREATE INDEX IF NOT EXISTS "cookie_consents_user_id_idx"
  ON "cookie_consents"("user_id");

-- CookieConsent: consent lookups for anonymous visitors
CREATE INDEX IF NOT EXISTS "cookie_consents_anonymous_id_idx"
  ON "cookie_consents"("anonymous_id");
