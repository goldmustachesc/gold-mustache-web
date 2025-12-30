"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DailySchedule, WeeklyCalendar } from "@/components/dashboard";
import {
  useBarberAppointments,
  useCancelAppointmentByBarber,
} from "@/hooks/useBooking";
import { useSignOut, useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { Clock, LogOut, Scissors, UserPlus } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import {
  formatDateToString,
  getBrazilDateString,
  parseDateString,
} from "@/utils/time-slots";
import Link from "next/link";

// Helper to get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  // Use midday to reduce cross-timezone day shifts when formatting dates later.
  d.setHours(12, 0, 0, 0);
  return d;
}

// Helper to get end of week (Saturday)
function getWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  // Use midday to reduce cross-timezone day shifts when formatting dates later.
  d.setHours(12, 0, 0, 0);
  return d;
}

export default function BarberDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseDateString(getBrazilDateString()),
  );

  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(selectedDate),
  );

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  // Redirect non-barbers to dashboard
  useEffect(() => {
    if (!barberLoading && user && !barberProfile) {
      toast.error("Acesso restrito a barbeiros");
      router.push(`/${locale}/dashboard`);
    }
  }, [barberProfile, barberLoading, user, router, locale]);

  // Use barber's actual ID from profile
  const barberId = barberProfile?.id ?? null;

  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);

  const { data: appointments = [], isLoading: appointmentsLoading } =
    useBarberAppointments(barberId, weekStart, weekEnd);

  const cancelAppointment = useCancelAppointmentByBarber();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelAppointment = async (
    appointmentId: string,
    reason: string,
  ) => {
    setCancellingId(appointmentId);
    try {
      await cancelAppointment.mutateAsync({ appointmentId, reason });
      toast.success("Agendamento cancelado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar");
    } finally {
      setCancellingId(null);
    }
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(
      newWeekStart.getDate() + (direction === "next" ? 7 : -7),
    );
    setWeekStart(newWeekStart);

    // Mantém o "dia selecionado" sincronizado com a semana navegada.
    // Isso evita ficar com selectedDate apontando para uma data fora do range carregado.
    setSelectedDate((prev) => {
      const nextSelected = new Date(prev);
      nextSelected.setDate(
        nextSelected.getDate() + (direction === "next" ? 7 : -7),
      );
      // Use midday to reduce cross-timezone day shifts when formatting dates later.
      nextSelected.setHours(12, 0, 0, 0);
      return nextSelected;
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Filter appointments for selected date
  // Note: Both formatting methods produce the same "YYYY-MM-DD" format for the same calendar day:
  // - apt.date comes from API formatted with formatPrismaDateToString (UTC methods)
  // - selectedDate is local, formatted with formatDateToString (local methods)
  // This works because both represent the same calendar date, just using different timezones
  // for the underlying Date object interpretation.
  const selectedDateStr = formatDateToString(selectedDate);
  const dailyAppointments = appointments.filter(
    (apt) => apt.date === selectedDateStr,
  );

  const isLoading = userLoading || barberLoading || appointmentsLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Minha Agenda</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/barbeiro/agendar`}>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Agendar para Cliente</span>
                <span className="sm:hidden">Agendar</span>
              </Button>
            </Link>
            <Link href={`/${locale}/barbeiro/horarios`}>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Meus Horários</span>
                <span className="sm:hidden">Horários</span>
              </Button>
            </Link>
            <Link href={`/${locale}/barbeiro/ausencias`}>
              <Button variant="outline" size="sm">
                Ausências
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Weekly Calendar */}
        <WeeklyCalendar
          weekStart={weekStart}
          appointments={appointments}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onWeekChange={handleWeekChange}
        />

        {/* Daily Schedule */}
        <DailySchedule
          date={selectedDate}
          appointments={dailyAppointments}
          onCancelAppointment={handleCancelAppointment}
          isCancelling={cancelAppointment.isPending}
          cancellingId={cancellingId}
        />
      </main>
    </div>
  );
}
