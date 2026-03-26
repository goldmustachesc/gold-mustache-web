"use client";

import { useState } from "react";
import { useCancelledAppointments } from "@/hooks/useCancelledAppointments";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, XCircle } from "lucide-react";
import { CancelledAppointmentCard } from "./CancelledAppointmentCard";

export function CancelledAppointmentsPage() {
  const [page, setPage] = useState(1);

  const { data: response, isLoading, error } = useCancelledAppointments(page);

  const appointments = response?.data ?? [];
  const meta = response?.meta;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <p className="text-zinc-500 text-sm">Agendamentos</p>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Cancelados
          {meta && meta.total > 0 && (
            <span className="text-lg font-normal text-zinc-500 ml-3">
              ({meta.total})
            </span>
          )}
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
          <>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <CancelledAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-zinc-400">
                  Página {page} de {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.totalPages}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
