"use client";

import type { CancelledAppointmentData } from "@/hooks/useCancelledAppointments";
import { cn } from "@/lib/utils";
import { Calendar, Clock, User, Scissors } from "lucide-react";

interface CancelledAppointmentCardProps {
  appointment: CancelledAppointmentData;
}

function formatDate(dateStr: string): string {
  // Format: "14 de jan. de 2026"
  const date = new Date(`${dateStr}T12:00:00`); // Add time to avoid timezone issues
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function CancelledAppointmentCard({
  appointment,
}: CancelledAppointmentCardProps) {
  return (
    <div
      className={cn(
        "p-4 lg:p-5 rounded-xl h-full",
        "bg-zinc-800/50 border border-zinc-700/50",
        "hover:bg-zinc-800/70 hover:border-zinc-600/50 transition-all duration-200",
      )}
    >
      {/* Header: Badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide",
            appointment.cancelledBy === "CLIENT"
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30",
          )}
        >
          {appointment.cancelledBy === "CLIENT"
            ? "Cancelado pelo Cliente"
            : "Cancelado pelo Barbeiro"}
        </span>
      </div>

      {/* Client Name */}
      <div className="flex items-center gap-2 mb-3">
        <User className="h-4 w-4 text-zinc-500 flex-shrink-0" />
        <h3 className="text-white font-semibold text-base lg:text-lg truncate">
          {appointment.clientName}
        </h3>
      </div>

      {/* Service */}
      <div className="flex items-center gap-2 mb-4">
        <Scissors className="h-4 w-4 text-zinc-500 flex-shrink-0" />
        <span className="text-zinc-400 text-sm truncate">
          {appointment.serviceName}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-700/50 my-3" />

      {/* Footer: Date, Time, Price */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(appointment.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{appointment.startTime}</span>
          </div>
        </div>
        <span className="text-amber-500 font-semibold">
          {formatCurrency(appointment.servicePrice)}
        </span>
      </div>
    </div>
  );
}
