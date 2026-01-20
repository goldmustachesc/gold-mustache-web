"use client";

import { Button } from "@/components/ui/button";
import type { ClientStats } from "@/types/dashboard";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 p-5">
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">
              Próximo Agendamento
            </span>
          </div>
          <span className="text-sm font-medium text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
            {timeUntil}
          </span>
        </div>

        {/* Service Info */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              {appointment.service.name}
            </h3>
            <p className="text-sm text-zinc-400">
              {appointment.service.duration} min • R${" "}
              {appointment.service.price.toFixed(2).replace(".", ",")}
            </p>
          </div>

          {/* Date & Time */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-zinc-300">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <span>{formatDateDdMmYyyyFromIsoDateLike(appointment.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span>
                {appointment.startTime} - {appointment.endTime}
              </span>
            </div>
          </div>

          {/* Barber */}
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <User className="h-4 w-4 text-zinc-500" />
            <span>Com {appointment.barber.name}</span>
          </div>

          {/* Location */}
          <a
            href={BRAND.contact.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            <span>{BRAND.contact.address}</span>
          </a>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-100"
          >
            <Link href={`/${locale}/meus-agendamentos`}>
              Ver detalhes
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Background decoration */}
      <Sparkles className="absolute -right-4 -bottom-4 h-24 w-24 text-emerald-500/10" />
    </div>
  );
}
