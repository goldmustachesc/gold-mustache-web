"use client";

import { GuestAppointmentsLookup } from "@/components/booking/GuestAppointmentsLookup";
import { FeedbackModal } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { useSignOut, useUser } from "@/hooks/useAuth";
import { useAppointmentActions } from "@/hooks/useAppointmentActions";
import {
  useCancelAppointment,
  useClientAppointments,
} from "@/hooks/useBooking";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useCreateFeedback } from "@/hooks/useFeedback";
import { filterAppointments } from "@/lib/booking/appointment-filters";
import { getAppointmentCancellationStatus } from "@/lib/booking/cancellation";
import type { AppointmentWithDetails } from "@/types/booking";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

import { AppointmentsHeader } from "./components/AppointmentsHeader";
import { AppointmentsLoadingSkeleton } from "./components/AppointmentsLoadingSkeleton";
import { AppointmentHistory } from "./components/AppointmentHistory";
import { EmptyAppointmentsState } from "./components/EmptyAppointmentsState";
import { QuickActions } from "./components/QuickActions";
import { UpcomingAppointments } from "./components/UpcomingAppointments";

function MeusAgendamentosContent() {
  const params = useParams();
  const locale = params.locale as string;

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: appointments, isLoading: appointmentsLoading } =
    useClientAppointments();
  const { data: stats } = useDashboardStats();
  const cancelMutation = useCancelAppointment();
  const createFeedbackMutation = useCreateFeedback();

  const {
    cancellingId,
    handleCancel,
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

  const { upcoming, history } = filterAppointments(appointments);

  return (
    <div className="min-h-screen bg-background">
      <AppointmentsHeader
        locale={locale}
        isLoading={isUserLoading}
        user={user ?? null}
        onSignOut={() => signOut()}
        isSigningOut={signOutPending}
      />

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
                  onCancel={handleCancel}
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
    </div>
  );
}

export function MeusAgendamentosClient() {
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
