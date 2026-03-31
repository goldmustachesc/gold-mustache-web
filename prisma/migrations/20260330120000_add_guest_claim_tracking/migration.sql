-- Preserve guest ownership history after explicit claim without destructive deletes.
ALTER TABLE "guest_clients"
ADD COLUMN "claimed_at" TIMESTAMP(3),
ADD COLUMN "claimed_by_profile_id" TEXT;

CREATE INDEX "guest_clients_claimed_by_profile_id_idx"
ON "guest_clients"("claimed_by_profile_id");

ALTER TABLE "guest_clients"
ADD CONSTRAINT "guest_clients_claimed_by_profile_id_fkey"
FOREIGN KEY ("claimed_by_profile_id") REFERENCES "profiles"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
