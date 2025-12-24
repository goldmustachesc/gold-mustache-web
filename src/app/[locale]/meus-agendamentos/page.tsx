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
import { useSearchParams, useParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useState, Suspense } from "react";

function MeusAgendamentosContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const phoneFromQuery = searchParams.get("phone");

  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: appointments, isLoading: appointmentsLoading } =
    useClientAppointments();
  const cancelMutation = useCancelAppointment();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const isGuest = !user && !userLoading;
  const isLoading = userLoading || appointmentsLoading;

  const handleCancel = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    try {
      await cancelMutation.mutateAsync({ appointmentId });
      toast.success("Agendamento cancelado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar");
    } finally {
      setCancellingId(null);
    }
  };

  const confirmedAppointments =
    appointments?.filter((apt) => apt.status === "CONFIRMED") || [];
  const otherAppointments =
    appointments?.filter((apt) => apt.status !== "CONFIRMED") || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${locale}/agendar`} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Meus Agendamentos</h1>
          </Link>
          <div className="flex items-center gap-4">
            {userLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  disabled={signOutPending}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Sair</span>
                </Button>
              </>
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Guest View - Phone lookup */}
        {isGuest && (
          <GuestAppointmentsLookup
            initialPhone={phoneFromQuery || undefined}
            locale={locale}
          />
        )}

        {/* Logged in user - Show their appointments directly */}
        {user && (
          <div className="space-y-6">
            {isLoading && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-muted animate-pulse rounded-lg"
                  />
                ))}
              </div>
            )}

            {!isLoading && appointments && appointments.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Nenhum agendamento</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você ainda não tem agendamentos futuros.
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/${locale}/agendar`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Fazer agendamento
                  </Link>
                </Button>
              </div>
            )}

            {!isLoading && confirmedAppointments.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">
                  Próximos Agendamentos ({confirmedAppointments.length})
                </h2>
                <div className="space-y-4">
                  {confirmedAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onCancel={() => handleCancel(appointment.id)}
                      isCancelling={cancellingId === appointment.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && otherAppointments.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg text-muted-foreground">
                  Histórico ({otherAppointments.length})
                </h2>
                <div className="space-y-4">
                  {otherAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && appointments && appointments.length > 0 && (
              <div className="pt-4">
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

        {/* Loading state for user check */}
        {userLoading && (
          <div className="space-y-4">
            <div className="h-12 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Carregando...
          </div>
        </div>
      }
    >
      <MeusAgendamentosContent />
    </Suspense>
  );
}
