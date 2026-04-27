-- CreateEnum
CREATE TYPE "AbsenceRecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "barber_absence_recurrences" (
  "id" TEXT NOT NULL,
  "barber_id" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "frequency" "AbsenceRecurrenceFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "ends_at" DATE,
  "occurrence_count" INTEGER,
  "start_time" TEXT,
  "end_time" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "barber_absence_recurrences_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "barber_absences"
  ADD COLUMN "recurrence_id" TEXT;

-- CreateIndex
CREATE INDEX "barber_absence_recurrences_barber_id_start_date_idx"
ON "barber_absence_recurrences"("barber_id", "start_date");

CREATE INDEX "barber_absences_recurrence_id_date_idx"
ON "barber_absences"("recurrence_id", "date");

-- AddForeignKey
ALTER TABLE "barber_absence_recurrences"
  ADD CONSTRAINT "barber_absence_recurrences_barber_id_fkey"
  FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barber_absences"
  ADD CONSTRAINT "barber_absences_recurrence_id_fkey"
  FOREIGN KEY ("recurrence_id") REFERENCES "barber_absence_recurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
