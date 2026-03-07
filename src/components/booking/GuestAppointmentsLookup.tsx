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
import { useAppointmentActions } from "@/hooks/useAppointmentActions";
import { filterAppointments } from "@/lib/booking/appointment-filters";
import { getAppointmentCancellationStatus } from "@/lib/booking/cancellation";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { hasGuestToken } from "@/lib/guest-session";
import type { AppointmentWithDetails } from "@/types/booking";
import Link from "next/link";

interface GuestAppointmentsLookupProps {
  locale: string;
}

export function GuestAppointmentsLookup({
  locale,
}: GuestAppointmentsLookupProps) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(hasGuestToken());
  }, []);

  const { data: appointments, isLoading, error } = useGuestAppointments();
  const cancelMutation = useCancelGuestAppointment();

  const { cancellingId, handleCancel } = useAppointmentActions({
    cancelMutateAsync: cancelMutation.mutateAsync,
  });

  const getCancellationStatus = (apt: AppointmentWithDetails) => {
    const minutesUntil = getMinutesUntilAppointment(apt.date, apt.startTime);
    return getAppointmentCancellationStatus(minutesUntil);
  };

  const { upcoming: confirmedAppointments, history: otherAppointments } =
    filterAppointments(appointments);

  if (hasToken === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 space-y-4">
          <div className="p-4 bg-muted rounded-full w-fit mx-auto">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground font-playfair">
              Nenhum agendamento neste dispositivo
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Seus agendamentos ficam vinculados ao dispositivo onde foram
              criados. Se você agendou em outro aparelho ou navegador, acesse
              por lá.
            </p>
          </div>
          <div className="pt-4 space-y-3">
            <Button
              asChild
              className="w-full sm:w-auto shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link href={`/${locale}/agendar`}>
                <Calendar className="h-4 w-4 mr-2" />
                Fazer novo agendamento
              </Link>
            </Button>
            <div className="flex items-start gap-2 p-3 bg-primary/10 text-primary rounded-xl text-sm max-w-md mx-auto border border-primary/20">
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
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-center border border-destructive/20">
          Erro ao buscar agendamentos. Tente novamente.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          {appointments && appointments.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground font-playfair">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
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
              <h2 className="font-semibold text-foreground">
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
              <h2 className="font-semibold text-muted-foreground">
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
