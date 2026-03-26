-- AlterTable: Add address and email verification fields to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "street" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "number" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "complement" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "neighborhood" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "zip_code" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;

