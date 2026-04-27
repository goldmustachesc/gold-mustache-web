-- AlterTable
ALTER TABLE "appointments"
ADD COLUMN "reminder_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "appointments_status_date_reminder_sent_at_idx"
ON "appointments"("status", "date", "reminder_sent_at");
