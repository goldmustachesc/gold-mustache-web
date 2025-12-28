"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ClientStats } from "@/types/dashboard";
import { Calendar, Clock, User, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { BRAND } from "@/constants/brand";

interface NextAppointmentCardProps {
  appointment: NonNullable<ClientStats["nextAppointment"]>;
  locale: string;
}

function getTimeUntil(dateStr: string, startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const [year, month, day] = dateStr.split("-").map(Number);

  const appointmentDate = new Date(year, month - 1, day, hours, minutes);
  const now = new Date();
  const diff = appointmentDate.getTime() - now.getTime();

  if (diff <= 0) return "Agora";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor(
    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `em ${days}d ${hoursLeft}h`;
  }
  if (hoursLeft > 0) {
    return `em ${hoursLeft}h ${minutesLeft}min`;
  }
  return `em ${minutesLeft}min`;
}

export function NextAppointmentCard({
  appointment,
  locale,
}: NextAppointmentCardProps) {
  const [timeUntil, setTimeUntil] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTimeUntil(getTimeUntil(appointment.date, appointment.startTime));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [appointment.date, appointment.startTime]);

  return (
    <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Próximo Agendamento
          </CardTitle>
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {timeUntil}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-3">
            {/* Service */}
            <div>
              <h3 className="font-semibold text-lg">
                {appointment.service.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {appointment.service.duration} min • R${" "}
                {appointment.service.price.toFixed(2).replace(".", ",")}
              </p>
            </div>

            {/* Date & Time */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDateDdMmYyyyFromIsoDateLike(appointment.date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {appointment.startTime} - {appointment.endTime}
                </span>
              </div>
            </div>

            {/* Barber */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Com {appointment.barber.name}</span>
            </div>

            {/* Location */}
            <a
              href={BRAND.contact.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="h-4 w-4" />
              <span>{BRAND.contact.address}</span>
            </a>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/${locale}/meus-agendamentos`}>
              Ver detalhes
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
