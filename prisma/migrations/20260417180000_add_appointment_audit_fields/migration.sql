-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('CLIENT', 'BARBER', 'ADMIN', 'GUEST', 'IMPORT');

-- AlterTable
ALTER TABLE "appointments"
  ADD COLUMN "source"        "AppointmentSource" NOT NULL DEFAULT 'CLIENT',
  ADD COLUMN "created_by"    TEXT,
  ADD COLUMN "cancelled_by"  TEXT,
  ADD COLUMN "rescheduled_by" TEXT;

-- CreateIndex
CREATE INDEX "appointments_source_idx" ON "appointments"("source");
