"use client";

import { GuestAppointmentsLookup } from "@/components/booking/GuestAppointmentsLookup";
import { Button } from "@/components/ui/button";
import { useUser, useSignOut } from "@/hooks/useAuth";
import {
  useClientAppointments,
  useCancelAppointment,
} from "@/hooks/useBooking";
import { AppointmentCard } from "@/components/booking/AppointmentCard";
import { Calendar, LogOut, LogIn, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useState, Suspense, useEffect } from "react";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { getAppointmentCancellationStatus } from "@/lib/booking/cancellation";
import type { AppointmentWithDetails } from "@/types/booking";

// Error codes from API - centralized for consistency
const CANCELLATION_ERROR_CODES = {
  BLOCKED: "CANCELLATION_BLOCKED",
} as const;

function MeusAgendamentosContent() {
  const params = useParams();
  const locale = params.locale as string;

  // Prevent hydration mismatch by tracking client mount
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: appointments, isLoading: appointmentsLoading } =
    useClientAppointments();
  const cancelMutation = useCancelAppointment();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Consider loading until mounted and user check completes
  const isUserLoading = !hasMounted || userLoading;
  const isGuest = hasMounted && !user && !userLoading;
  const isLoading = isUserLoading || appointmentsLoading;

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

  return (
    <div className="min-h-screen bg-background dark:bg-zinc-900">
      <header className="border-b border-border dark:border-zinc-800 bg-background/95 dark:bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-zinc-900/80 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/${locale}/agendar`}
            className="flex items-center gap-2 text-foreground dark:text-zinc-100 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold">Meus Agendamentos</h1>
          </Link>
          <div className="flex items-center gap-3">
            {isUserLoading ? (
              <div className="h-8 w-16 bg-muted dark:bg-zinc-800 animate-pulse rounded" />
            ) : user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                disabled={signOutPending}
                className="text-muted-foreground hover:text-foreground hover:bg-muted dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sair</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/${locale}/login?redirect=/${locale}/meus-agendamentos`}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Entrar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        {/* Guest View - Token-based lookup */}
        {isGuest && <GuestAppointmentsLookup locale={locale} />}

        {/* Logged in user - Show their appointments directly */}
        {hasMounted && user && (
          <div className="space-y-6">
            {/* Botão de novo agendamento sempre visível no topo */}
            {!isLoading && (
              <Button asChild className="w-full shadow-md">
                <Link href={`/${locale}/agendar`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Fazer novo agendamento
                </Link>
              </Button>
            )}

            {isLoading && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-muted dark:bg-zinc-800 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            )}

            {!isLoading && appointments && appointments.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="p-4 bg-muted dark:bg-zinc-800 rounded-full w-fit mx-auto">
                  <Calendar className="h-8 w-8 text-muted-foreground dark:text-zinc-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground dark:text-zinc-100">
                    Nenhum agendamento
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-zinc-500 mt-1">
                    Você ainda não tem agendamentos futuros.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && confirmedAppointments.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-foreground dark:text-zinc-100">
                  Próximos Agendamentos ({confirmedAppointments.length})
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

            {!isLoading && otherAppointments.length > 0 && (
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
          </div>
        )}

        {/* Loading state for user check */}
        {isUserLoading && (
          <div className="space-y-4">
            <div className="h-12 bg-muted dark:bg-zinc-800 animate-pulse rounded-lg" />
            <div className="h-48 bg-muted dark:bg-zinc-800 animate-pulse rounded-xl" />
          </div>
        )}
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default function MeusAgendamentosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background dark:bg-zinc-900 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground dark:text-zinc-500">
            Carregando...
          </div>
        </div>
      }
    >
      <MeusAgendamentosContent />
    </Suspense>
  );
}
