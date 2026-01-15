"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Smartphone, AlertCircle } from "lucide-react";
import {
  useGuestAppointments,
  useCancelGuestAppointment,
} from "@/hooks/useBooking";
import { AppointmentCard } from "./AppointmentCard";
import { SignupIncentiveBanner } from "./SignupIncentiveBanner";
import { toast } from "sonner";
import Link from "next/link";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { getAppointmentCancellationStatus } from "@/lib/booking/cancellation";
import { hasGuestToken } from "@/lib/guest-session";
import type { AppointmentWithDetails } from "@/types/booking";

// Error codes from API - centralized for consistency
const CANCELLATION_ERROR_CODES = {
  BLOCKED: "CANCELLATION_BLOCKED",
} as const;

interface GuestAppointmentsLookupProps {
  locale: string;
}

export function GuestAppointmentsLookup({
  locale,
}: GuestAppointmentsLookupProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  // Check for token on mount (client-side only)
  useEffect(() => {
    setHasToken(hasGuestToken());
  }, []);

  const { data: appointments, isLoading, error } = useGuestAppointments();
  const cancelMutation = useCancelGuestAppointment();

  const handleCancel = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    try {
      await cancelMutation.mutateAsync({ appointmentId });
      toast.success("Agendamento cancelado com sucesso!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao cancelar";
      if (errorMessage === CANCELLATION_ERROR_CODES.BLOCKED) {
        toast.error(
          "Cancelamento não permitido com menos de 2 horas de antecedência.",
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setCancellingId(null);
    }
  };

  const isPastOrStarted = (apt: AppointmentWithDetails) =>
    getMinutesUntilAppointment(apt.date, apt.startTime) <= 0;

  const getCancellationStatus = (apt: AppointmentWithDetails) => {
    const minutesUntil = getMinutesUntilAppointment(apt.date, apt.startTime);
    return getAppointmentCancellationStatus(minutesUntil);
  };

  const confirmedAppointments =
    appointments?.filter(
      (apt) => apt.status === "CONFIRMED" && !isPastOrStarted(apt),
    ) || [];
  const otherAppointments =
    appointments?.filter(
      (apt) => apt.status !== "CONFIRMED" || isPastOrStarted(apt),
    ) || [];

  // Loading state while checking for token
  if (hasToken === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // No token found - show message
  if (!hasToken) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 space-y-4">
          <div className="p-4 bg-muted dark:bg-zinc-800 rounded-full w-fit mx-auto">
            <Smartphone className="h-8 w-8 text-muted-foreground dark:text-zinc-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground dark:text-zinc-100">
              Nenhum agendamento neste dispositivo
            </h3>
            <p className="text-sm text-muted-foreground dark:text-zinc-500 max-w-md mx-auto">
              Seus agendamentos ficam vinculados ao dispositivo onde foram
              criados. Se você agendou em outro aparelho ou navegador, acesse
              por lá.
            </p>
          </div>
          <div className="pt-4 space-y-3">
            <Button asChild className="w-full sm:w-auto shadow-md">
              <Link href={`/${locale}/agendar`}>
                <Calendar className="h-4 w-4 mr-2" />
                Fazer novo agendamento
              </Link>
            </Button>
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-sm max-w-md mx-auto">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Dica: Crie uma conta para acessar seus agendamentos de qualquer
                dispositivo.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-center">
          Erro ao buscar agendamentos. Tente novamente.
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {appointments && appointments.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="p-4 bg-muted dark:bg-zinc-800 rounded-full w-fit mx-auto">
                <Calendar className="h-8 w-8 text-muted-foreground dark:text-zinc-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground dark:text-zinc-100">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-sm text-muted-foreground dark:text-zinc-500 mt-1">
                  Você ainda não tem agendamentos futuros neste dispositivo.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/${locale}/agendar`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Fazer novo agendamento
                </Link>
              </Button>
            </div>
          )}

          {confirmedAppointments.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground dark:text-zinc-100">
                Agendamentos Confirmados ({confirmedAppointments.length})
              </h2>
              <div className="space-y-3">
                {confirmedAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onCancel={() => handleCancel(appointment.id)}
                    isCancelling={cancellingId === appointment.id}
                    canCancel={getCancellationStatus(appointment).canCancel}
                    isCancellationBlocked={
                      getCancellationStatus(appointment).isBlocked
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {otherAppointments.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-muted-foreground dark:text-zinc-500">
                Histórico ({otherAppointments.length})
              </h2>
              <div className="space-y-3">
                {otherAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                  />
                ))}
              </div>
            </div>
          )}

          {appointments && appointments.length > 0 && (
            <div className="pt-4 space-y-4">
              <SignupIncentiveBanner locale={locale} />
              <Button asChild variant="outline" className="w-full">
                <Link href={`/${locale}/agendar`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Fazer novo agendamento
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
