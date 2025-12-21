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
import { LogOut, Scissors } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDateToString, parseDateString } from "@/utils/time-slots";

// Helper to get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to get end of week (Saturday)
function getWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function BarberDashboardPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  // Redirect non-barbers to dashboard
  useEffect(() => {
    if (!barberLoading && !barberProfile) {
      toast.error("Acesso restrito a barbeiros");
      router.push("/dashboard");
    }
  }, [barberProfile, barberLoading, router]);

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
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Filter appointments for selected date
  // Use formatDateToString to ensure correct local timezone comparison
  const dailyAppointments = appointments.filter((apt) => {
    // apt.date comes as ISO string from API, parse it properly
    const aptDate = formatDateToString(parseDateString(apt.date.split("T")[0]));
    const selectedDateStr = formatDateToString(selectedDate);
    return aptDate === selectedDateStr;
  });

  const isLoading = userLoading || barberLoading || appointmentsLoading;

  if (isLoading || !barberProfile) {
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
