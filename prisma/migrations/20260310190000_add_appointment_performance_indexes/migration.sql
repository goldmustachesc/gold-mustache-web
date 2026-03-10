-- CreateIndex
CREATE INDEX "appointments_barber_id_date_status_idx" ON "appointments"("barber_id", "date", "status");

-- CreateIndex
CREATE INDEX "appointments_date_status_idx" ON "appointments"("date", "status");
