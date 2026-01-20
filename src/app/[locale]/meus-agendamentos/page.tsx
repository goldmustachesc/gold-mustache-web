"use client";

import { GuestAppointmentsLookup } from "@/components/booking/GuestAppointmentsLookup";
import { Button } from "@/components/ui/button";
import { useUser, useSignOut } from "@/hooks/useAuth";
import {
  useClientAppointments,
  useCancelAppointment,
} from "@/hooks/useBooking";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { AppointmentCard } from "@/components/booking/AppointmentCard";
import {
  Calendar,
  LogOut,
  LogIn,
  ArrowLeft,
  Plus,
  Scissors,
  Star,
  History,
  CalendarCheck,
  TrendingUp,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useState, Suspense, useEffect } from "react";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { getAppointmentCancellationStatus } from "@/lib/booking/cancellation";
import type { AppointmentWithDetails } from "@/types/booking";
import { BRAND } from "@/constants/brand";
import Image from "next/image";

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
  const { data: stats } = useDashboardStats();
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

  // Client stats from dashboard
  const clientStats = stats?.client;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 text-zinc-100 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <Image
              src="/logo.png"
              alt="Gold Mustache"
              width={36}
              height={36}
              className="rounded-full"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">Meus Agendamentos</h1>
              <p className="text-xs text-zinc-500">Gold Mustache Barbearia</p>
            </div>
            <h1 className="sm:hidden text-lg font-semibold">
              Meus Agendamentos
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            {isUserLoading ? (
              <div className="h-8 w-20 bg-zinc-800 animate-pulse rounded" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="hidden md:inline text-sm text-zinc-400">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  disabled={signOutPending}
                  className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Sair</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-zinc-700 bg-zinc-800/50"
              >
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

      <main className="container mx-auto px-4 py-6 lg:py-8">
        {/* Guest View - Token-based lookup */}
        {isGuest && (
          <div className="max-w-lg mx-auto">
            <GuestAppointmentsLookup locale={locale} />
          </div>
        )}

        {/* Logged in user - Show their appointments directly */}
        {hasMounted && user && (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
              <div className="sticky top-24 space-y-6">
                {/* New Appointment Card */}
                <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100">
                        Novo Agendamento
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Agende seu próximo horário
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20"
                  >
                    <Link href={`/${locale}/agendar`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agendar Horário
                    </Link>
                  </Button>
                </div>

                {/* Quick Stats */}
                {clientStats && clientStats.totalVisits > 0 && (
                  <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-amber-400" />
                      <h3 className="font-semibold text-zinc-200">
                        Suas Estatísticas
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                        <p className="text-2xl font-bold text-amber-400">
                          {clientStats.totalVisits}
                        </p>
                        <p className="text-xs text-zinc-500">Visitas</p>
                      </div>
                      <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                        <p className="text-lg font-bold text-zinc-100">
                          R${" "}
                          {clientStats.totalSpent
                            .toFixed(0)
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                        </p>
                        <p className="text-xs text-zinc-500">Total Gasto</p>
                      </div>
                    </div>

                    {/* Favorites */}
                    {(clientStats.favoriteBarber ||
                      clientStats.favoriteService) && (
                      <div className="space-y-3 pt-2">
                        {clientStats.favoriteBarber && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2">
                              <Star className="h-3.5 w-3.5" />
                              Barbeiro favorito
                            </span>
                            <span className="text-zinc-300 font-medium">
                              {clientStats.favoriteBarber.name}
                            </span>
                          </div>
                        )}
                        {clientStats.favoriteService && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2">
                              <Scissors className="h-3.5 w-3.5" />
                              Serviço favorito
                            </span>
                            <span className="text-zinc-300 font-medium">
                              {clientStats.favoriteService.name}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Location Card */}
                <div className="rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-semibold text-zinc-300">Localização</h3>
                  </div>
                  <a
                    href={BRAND.contact.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-amber-400 transition-colors"
                  >
                    {BRAND.contact.address}
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              {/* Mobile: New Appointment Button */}
              {!isLoading && (
                <Button
                  asChild
                  className="w-full lg:hidden shadow-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                >
                  <Link href={`/${locale}/agendar`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Fazer novo agendamento
                  </Link>
                </Button>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-4">
                  <div className="h-12 bg-zinc-800 animate-pulse rounded-lg lg:hidden" />
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-48 bg-zinc-800 animate-pulse rounded-xl"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && appointments && appointments.length === 0 && (
                <div className="text-center py-16 space-y-6">
                  <div className="p-6 bg-zinc-800/50 rounded-full w-fit mx-auto">
                    <Calendar className="h-12 w-12 text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-100">
                      Nenhum agendamento ainda
                    </h3>
                    <p className="text-zinc-500 mt-2 max-w-md mx-auto">
                      Você ainda não tem agendamentos. Que tal marcar seu
                      primeiro horário?
                    </p>
                  </div>
                  <Button
                    asChild
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                  >
                    <Link href={`/${locale}/agendar`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agendar Horário
                    </Link>
                  </Button>
                </div>
              )}

              {/* Upcoming Appointments */}
              {!isLoading && confirmedAppointments.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CalendarCheck className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-zinc-100">
                        Próximos Agendamentos
                      </h2>
                      <p className="text-xs text-zinc-500">
                        {confirmedAppointments.length} agendamento
                        {confirmedAppointments.length > 1 ? "s" : ""} confirmado
                        {confirmedAppointments.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
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
                </section>
              )}

              {/* History */}
              {!isLoading && otherAppointments.length > 0 && (
                <section className="pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                      <History className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-zinc-400">Histórico</h2>
                      <p className="text-xs text-zinc-600">
                        {otherAppointments.length} agendamento
                        {otherAppointments.length > 1 ? "s" : ""} anterior
                        {otherAppointments.length > 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {otherAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Loading state for user check */}
        {isUserLoading && (
          <div className="max-w-lg mx-auto lg:max-w-none space-y-4">
            <div className="h-12 bg-zinc-800 animate-pulse rounded-lg" />
            <div className="h-48 bg-zinc-800 animate-pulse rounded-xl" />
          </div>
        )}
      </main>

      <Toaster
        position="bottom-center"
        theme="dark"
        closeButton
        toastOptions={{
          className:
            "!bg-zinc-900/95 !backdrop-blur-xl !border !border-zinc-700/50 !shadow-2xl !shadow-black/20 !rounded-xl",
          descriptionClassName: "!text-zinc-400",
          style: {
            padding: "16px",
          },
          classNames: {
            success:
              "!border-emerald-500/30 !text-emerald-50 [&>svg]:!text-emerald-400",
            error: "!border-red-500/30 !text-red-50 [&>svg]:!text-red-400",
            warning:
              "!border-amber-500/30 !text-amber-50 [&>svg]:!text-amber-400",
            info: "!border-blue-500/30 !text-blue-50 [&>svg]:!text-blue-400",
          },
        }}
      />
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
