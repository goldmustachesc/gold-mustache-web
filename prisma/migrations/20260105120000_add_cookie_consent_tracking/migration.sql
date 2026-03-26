-- CreateTable
CREATE TABLE "cookie_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "anonymous_id" VARCHAR(255),
    "analytics_consent" BOOLEAN NOT NULL DEFAULT false,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "consent_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "cookie_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique to prevent duplicates and enable efficient upsert)
CREATE UNIQUE INDEX "cookie_consents_user_id_key" ON "cookie_consents"("user_id") WHERE "user_id" IS NOT NULL;

-- CreateIndex (unique to prevent duplicates and enable efficient upsert)
CREATE UNIQUE INDEX "cookie_consents_anonymous_id_key" ON "cookie_consents"("anonymous_id") WHERE "anonymous_id" IS NOT NULL;

-- Add check constraint to ensure at least one identifier is present
ALTER TABLE "cookie_consents" ADD CONSTRAINT "consent_identifier_check" 
    CHECK ("user_id" IS NOT NULL OR "anonymous_id" IS NOT NULL);

