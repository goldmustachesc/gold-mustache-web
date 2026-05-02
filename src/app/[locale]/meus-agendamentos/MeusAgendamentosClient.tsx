"use client";

import { CancelAppointmentDialog } from "@/components/booking/CancelAppointmentDialog";
import { GuestAppointmentsLookup } from "@/components/booking/GuestAppointmentsLookup";
import { FeedbackModal } from "@/components/feedback";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { PrivateShell } from "@/components/private/PrivateShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/hooks/useAuth";
import { useAppointmentActions } from "@/hooks/useAppointmentActions";
import {
  useCancelAppointment,
  useClaimGuestAppointments,
  useClientAppointments,
} from "@/hooks/useBooking";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useCreateFeedback } from "@/hooks/useFeedback";
import { hasGuestToken } from "@/lib/guest-session";
import { filterAppointments } from "@/lib/booking/appointment-filters";
import { getAppointmentCancellationStatus } from "@/lib/booking/cancellation";
import type { AppointmentWithDetails } from "@/types/booking";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { ClipboardList, Import, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";

import { AppointmentsLoadingSkeleton } from "./components/AppointmentsLoadingSkeleton";
import { AppointmentHistory } from "./components/AppointmentHistory";
import { EmptyAppointmentsState } from "./components/EmptyAppointmentsState";
import { QuickActions } from "./components/QuickActions";
import { UpcomingAppointments } from "./components/UpcomingAppointments";

function MeusAgendamentosContent() {
  const params = useParams();
  const locale = params.locale as string;

  const [hasMounted, setHasMounted] = useState(false);
  const [hasGuestClaimToken, setHasGuestClaimToken] = useState(false);
  useEffect(() => {
    setHasMounted(true);
    setHasGuestClaimToken(hasGuestToken());
  }, []);

  const { data: user, isLoading: userLoading } = useUser();
  const shouldLoadAuthenticatedData = hasMounted && !!user;
  const { data: appointments, isLoading: appointmentsLoading } =
    useClientAppointments(shouldLoadAuthenticatedData);
  const { data: stats } = useDashboardStats(shouldLoadAuthenticatedData);
  const cancelMutation = useCancelAppointment();
  const claimGuestAppointmentsMutation = useClaimGuestAppointments();
  const createFeedbackMutation = useCreateFeedback();

  const {
    cancellingId,
    pendingCancelId,
    requestCancel,
    confirmCancel,
    dismissCancel,
    feedbackModalOpen,
    setFeedbackModalOpen,
    feedbackAppointment,
    feedbacksGiven,
    handleOpenFeedback,
    handleSubmitFeedback,
  } = useAppointmentActions({
    cancelMutateAsync: cancelMutation.mutateAsync,
    feedbackMutateAsync: createFeedbackMutation.mutateAsync,
  });

  const isUserLoading = !hasMounted || userLoading;
  const isGuest = hasMounted && !user && !userLoading;
  const isLoading = isUserLoading || appointmentsLoading;

  const getCancellationStatus = (apt: AppointmentWithDetails) => {
    const minutesUntil = getMinutesUntilAppointment(apt.date, apt.startTime);
    return getAppointmentCancellationStatus(minutesUntil);
  };

  const handleClaimGuestAppointments = async () => {
    try {
      const result = await claimGuestAppointmentsMutation.mutateAsync();
      setHasGuestClaimToken(false);

      if (result.appointmentsTransferred > 0) {
        toast.success(
          `${result.appointmentsTransferred} agendamento(s) guest importado(s) para sua conta.`,
        );
        return;
      }

      toast.success("Histórico guest deste dispositivo importado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao importar agendamentos guest.",
      );
    }
  };

  const { upcoming, history } = filterAppointments(appointments);

  usePrivateHeader({
    title: "Meus Agendamentos",
    icon: ClipboardList,
    backHref: `/${locale}/dashboard`,
  });

  return (
    <div>
      <main className="container mx-auto px-4 py-6 lg:py-8">
        {isGuest && (
          <div className="max-w-lg mx-auto">
            <GuestAppointmentsLookup locale={locale} />
          </div>
        )}

        {hasMounted && user && (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
              <div className="sticky top-24">
                <QuickActions locale={locale} clientStats={stats?.client} />
              </div>
            </aside>

            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              {hasGuestClaimToken && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Import className="h-4 w-4" />
                      Importar agendamentos guest
                    </CardTitle>
                    <CardDescription>
                      Encontramos um histórico guest salvo neste dispositivo.
                      Importe-o para centralizar seus agendamentos nesta conta.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      onClick={handleClaimGuestAppointments}
                      disabled={claimGuestAppointmentsMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {claimGuestAppointmentsMutation.isPending
                        ? "Importando..."
                        : "Importar meus agendamentos guest"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!isLoading && (
                <Button
                  asChild
                  className="w-full lg:hidden shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Link href={`/${locale}/agendar`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Fazer novo agendamento
                  </Link>
                </Button>
              )}

              {isLoading && <AppointmentsLoadingSkeleton />}

              {!isLoading && appointments && appointments.length === 0 && (
                <EmptyAppointmentsState locale={locale} />
              )}

              {!isLoading && upcoming.length > 0 && (
                <UpcomingAppointments
                  appointments={upcoming}
                  cancellingId={cancellingId}
                  onCancel={requestCancel}
                  getCancellationStatus={getCancellationStatus}
                />
              )}

              {!isLoading && history.length > 0 && (
                <AppointmentHistory
                  appointments={history}
                  feedbacksGiven={feedbacksGiven}
                  onOpenFeedback={handleOpenFeedback}
                />
              )}
            </div>
          </div>
        )}

        {isUserLoading && (
          <div className="max-w-lg mx-auto lg:max-w-none">
            <AppointmentsLoadingSkeleton />
          </div>
        )}
      </main>

      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        onSubmit={handleSubmitFeedback}
        isLoading={createFeedbackMutation.isPending}
        barberName={feedbackAppointment?.barber.name}
        serviceName={feedbackAppointment?.service.name}
        appointmentDate={feedbackAppointment?.date}
      />

      <CancelAppointmentDialog
        open={pendingCancelId !== null}
        isLoading={cancellingId !== null}
        onConfirm={confirmCancel}
        onDismiss={dismissCancel}
      />
    </div>
  );
}

export function MeusAgendamentosClient() {
  return (
    <PrivateShell>
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
    </PrivateShell>
  );
}
