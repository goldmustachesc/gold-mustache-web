"use client";

import { useCancelledAppointments } from "@/hooks/useCancelledAppointments";
import { Loader2, XCircle } from "lucide-react";
import { CancelledAppointmentCard } from "./CancelledAppointmentCard";

export function CancelledAppointmentsPage() {
  const {
    data: appointments = [],
    isLoading,
    error,
  } = useCancelledAppointments();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <p className="text-zinc-500 text-sm">Agendamentos</p>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Cancelados
        </h1>
      </div>

      {/* List */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-400">Erro ao carregar cancelamentos</p>
            <p className="text-zinc-500 text-sm mt-1">
              Tente novamente mais tarde
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="h-12 w-12 text-zinc-700 mb-4" />
            <p className="text-zinc-400">Nenhum agendamento cancelado</p>
            <p className="text-zinc-500 text-sm mt-1">
              Os cancelamentos aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <CancelledAppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
