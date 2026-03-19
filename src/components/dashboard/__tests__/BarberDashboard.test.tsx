import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BarberDashboard } from "../BarberDashboard";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  usePrivateHeader: vi.fn(),
  userState: {
    data: { id: "user-1" } as { id: string } | null,
    isLoading: false,
  },
  barberState: {
    data: { id: "barber-1", name: "Carlos Silva" } as {
      id: string;
      name: string;
    } | null,
    isLoading: false,
  },
  statsState: {
    data: {
      barber: {
        todayAppointments: 2,
        todayEarnings: 120,
        weekAppointments: 8,
        weekEarnings: 480,
      },
    },
  },
  appointmentsState: {
    data: [
      {
        id: "apt-1",
        date: "2026-03-19",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        service: { name: "Corte", price: 50 },
        client: { fullName: "João" },
        guestClient: null,
      },
    ],
    isLoading: false,
  },
  workingHoursState: {
    data: [
      {
        dayOfWeek: 4,
        isWorking: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: null,
        breakEnd: null,
      },
    ],
  },
  absencesState: {
    data: [
      {
        id: "absence-1",
        date: "2026-03-19",
        startTime: "14:00",
        endTime: "15:00",
        reason: "Curso",
      },
    ],
    isLoading: false,
  },
  cancelMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  noShowMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  completeMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mocks.userState,
}));

vi.mock("@/hooks/useBarberProfile", () => ({
  useBarberProfile: () => mocks.barberState,
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: () => mocks.statsState,
}));

vi.mock("@/hooks/useBarberWorkingHours", () => ({
  useMyWorkingHours: () => mocks.workingHoursState,
}));

vi.mock("@/hooks/useBarberAbsences", () => ({
  useBarberAbsences: () => mocks.absencesState,
}));

vi.mock("@/hooks/useBooking", () => ({
  useBarberAppointments: () => mocks.appointmentsState,
  useCancelAppointmentByBarber: () => mocks.cancelMutation,
  useMarkNoShow: () => mocks.noShowMutation,
  useMarkCompleted: () => mocks.completeMutation,
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: (...args: unknown[]) => mocks.usePrivateHeader(...args),
  PrivateHeaderActions: ({ children }: { children: ReactNode }) => (
    <div data-testid="private-header-actions">{children}</div>
  ),
}));

vi.mock("@/components/private/mobile-nav-layout", () => ({
  mobileFabOffsetClassName: "bottom-6",
}));

vi.mock("../BarberStatsCards", () => ({
  BarberStatsCards: ({ hideValues }: { hideValues: boolean }) => (
    <div data-testid="stats-cards">{hideValues ? "hidden" : "visible"}</div>
  ),
}));

vi.mock("../WeeklyCalendar", () => ({
  WeeklyCalendar: ({
    onWeekChange,
    onDateSelect,
  }: {
    onWeekChange: (direction: "prev" | "next") => void;
    onDateSelect: (date: Date) => void;
  }) => (
    <div data-testid="weekly-calendar">
      <button type="button" onClick={() => onWeekChange("next")}>
        next-week
      </button>
      <button
        type="button"
        onClick={() => onDateSelect(new Date("2026-03-20T12:00:00Z"))}
      >
        select-date
      </button>
    </div>
  ),
}));

vi.mock("../DailySchedule", () => ({
  DailySchedule: ({
    appointments,
    hideValues,
    onCreateAppointmentFromSlot,
    onCreateAbsenceFromSlot,
    onCancelAppointment,
    onMarkNoShow,
    onMarkComplete,
  }: {
    appointments: Array<{ id: string }>;
    hideValues: boolean;
    onCreateAppointmentFromSlot?: (time: string) => void;
    onCreateAbsenceFromSlot?: (startTime: string, endTime: string) => void;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onMarkNoShow?: (id: string) => Promise<void>;
    onMarkComplete?: (id: string) => Promise<void>;
  }) => (
    <div data-testid="daily-schedule">
      <span>{`appointments:${appointments.length}`}</span>
      <span>{hideValues ? "daily-hidden" : "daily-visible"}</span>
      <button
        type="button"
        onClick={() => onCreateAppointmentFromSlot?.("09:00")}
      >
        create-appointment
      </button>
      <button
        type="button"
        onClick={() => onCreateAbsenceFromSlot?.("14:00", "15:00")}
      >
        create-absence
      </button>
      <button
        type="button"
        onClick={() => void onCancelAppointment("apt-1", "Cliente pediu")}
      >
        cancel-appointment
      </button>
      <button type="button" onClick={() => void onMarkNoShow?.("apt-1")}>
        mark-no-show
      </button>
      <button type="button" onClick={() => void onMarkComplete?.("apt-1")}>
        mark-complete
      </button>
    </div>
  ),
}));

vi.mock("@/utils/time-slots", async () => {
  const actual =
    await vi.importActual<typeof import("@/utils/time-slots")>(
      "@/utils/time-slots",
    );
  return {
    ...actual,
    getBrazilDateString: () => "2026-03-19",
  };
});

describe("BarberDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userState.data = { id: "user-1" };
    mocks.userState.isLoading = false;
    mocks.barberState.data = { id: "barber-1", name: "Carlos Silva" };
    mocks.barberState.isLoading = false;
    mocks.appointmentsState.isLoading = false;
    mocks.absencesState.isLoading = false;
    mocks.cancelMutation.mutateAsync.mockResolvedValue(undefined);
    mocks.noShowMutation.mutateAsync.mockResolvedValue(undefined);
    mocks.completeMutation.mutateAsync.mockResolvedValue(undefined);
  });

  it("mostra estado de loading enquanto os dados iniciais carregam", () => {
    mocks.userState.isLoading = true;

    render(<BarberDashboard locale="pt-BR" />);

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("redireciona visitante para login", async () => {
    mocks.userState.data = null;

    render(<BarberDashboard locale="pt-BR" />);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/pt-BR/login");
    });
  });

  it("bloqueia usuario sem perfil de barbeiro", async () => {
    mocks.barberState.data = null;

    render(<BarberDashboard locale="pt-BR" />);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Acesso restrito a barbeiros",
      );
      expect(mocks.push).toHaveBeenCalledWith("/pt-BR/dashboard");
    });
  });

  it("renderiza dashboard e alterna o estado de ocultar valores", async () => {
    const user = userEvent.setup();

    render(<BarberDashboard locale="pt-BR" />);

    expect(screen.getAllByTestId("stats-cards")[0]).toHaveTextContent(
      "visible",
    );
    expect(screen.getAllByTestId("daily-schedule")[0]).toHaveTextContent(
      "appointments:1",
    );

    await user.click(screen.getByTitle("Ocultar valores"));

    expect(screen.getAllByTestId("stats-cards")[0]).toHaveTextContent("hidden");
    expect(screen.getAllByTestId("daily-schedule")[0]).toHaveTextContent(
      "daily-hidden",
    );
  });

  it("navega para criar agendamento e ausencia a partir do DailySchedule", async () => {
    const user = userEvent.setup();

    render(<BarberDashboard locale="pt-BR" />);

    await user.click(screen.getAllByText("create-appointment")[0]);
    await user.click(screen.getAllByText("create-absence")[0]);

    expect(mocks.push).toHaveBeenCalledWith(
      "/pt-BR/barbeiro/agendar?date=2026-03-19&time=09%3A00",
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/pt-BR/barbeiro/ausencias?date=2026-03-19&startTime=14%3A00&endTime=15%3A00&allDay=false",
    );
  });

  it("mostra toasts de sucesso para acoes do agendamento", async () => {
    const user = userEvent.setup();

    render(<BarberDashboard locale="pt-BR" />);

    await user.click(screen.getAllByText("cancel-appointment")[0]);
    await user.click(screen.getAllByText("mark-no-show")[0]);
    await user.click(screen.getAllByText("mark-complete")[0]);

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Agendamento cancelado com sucesso!",
      );
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Cliente marcado como não compareceu.",
      );
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Atendimento concluído com sucesso!",
      );
    });
  });
});
