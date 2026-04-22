-- CreateTable
CREATE TABLE "admin_audit_logs" (
  "id" TEXT NOT NULL,
  "actor_profile_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_profile_id_created_at_idx"
ON "admin_audit_logs"("actor_profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_logs_resource_type_resource_id_created_at_idx"
ON "admin_audit_logs"("resource_type", "resource_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_created_at_idx"
ON "admin_audit_logs"("action", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "admin_audit_logs"
ADD CONSTRAINT "admin_audit_logs_actor_profile_id_fkey"
FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
