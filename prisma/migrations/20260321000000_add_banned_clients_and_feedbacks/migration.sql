-- CreateTable: banned_clients
-- Tracks bans applied to registered clients (via profileId) or guest clients (via guestClientId).
-- bannedBy references the barber who applied the ban.

CREATE TABLE "banned_clients" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT,
    "guest_client_id" TEXT,
    "reason" TEXT,
    "banned_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable: feedbacks
-- One feedback per appointment. Rating 1-5 with optional comment.
-- Supports both authenticated clients (clientId) and guest clients (guestClientId).

CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "client_id" TEXT,
    "guest_client_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraints

CREATE UNIQUE INDEX "banned_clients_profile_id_key" ON "banned_clients"("profile_id");

CREATE UNIQUE INDEX "banned_clients_guest_client_id_key" ON "banned_clients"("guest_client_id");

CREATE UNIQUE INDEX "feedbacks_appointment_id_key" ON "feedbacks"("appointment_id");

-- CreateIndex: performance indexes for feedbacks

CREATE INDEX "feedbacks_barber_id_idx" ON "feedbacks"("barber_id");

CREATE INDEX "feedbacks_client_id_idx" ON "feedbacks"("client_id");

CREATE INDEX "feedbacks_guest_client_id_idx" ON "feedbacks"("guest_client_id");

CREATE INDEX "feedbacks_created_at_idx" ON "feedbacks"("created_at");

-- AddForeignKey: banned_clients

ALTER TABLE "banned_clients" ADD CONSTRAINT "banned_clients_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "banned_clients" ADD CONSTRAINT "banned_clients_guest_client_id_fkey"
    FOREIGN KEY ("guest_client_id") REFERENCES "guest_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "banned_clients" ADD CONSTRAINT "banned_clients_banned_by_fkey"
    FOREIGN KEY ("banned_by") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: feedbacks

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_barber_id_fkey"
    FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_guest_client_id_fkey"
    FOREIGN KEY ("guest_client_id") REFERENCES "guest_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
