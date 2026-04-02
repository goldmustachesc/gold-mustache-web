import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BarberDashboard } from "../BarberDashboard";

const barberProfile = {
  id: "barber-1",
  name: "Carlos Silva",
} as const;

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  usePrivateHeader: vi.fn(),
  useBarberAppointments: vi.fn(),
  appointmentsState: {
    data: [
      {
        id: "apt-1",
        date: "2026-03-19",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-19T09:00:00.000Z",
        createdAt: "2026-03-19T09:00:00.000Z",
        service: { id: "svc-1", name: "Corte", duration: 30, price: 50 },
        client: { id: "client-1", fullName: "João", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
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

vi.mock("@/hooks/useBarberWorkingHours", () => ({
  useMyWorkingHours: () => mocks.workingHoursState,
}));

vi.mock("@/hooks/useBarberAbsences", () => ({
  useBarberAbsences: () => mocks.absencesState,
}));

vi.mock("@/hooks/useBooking", () => ({
  useBarberAppointments: (...args: unknown[]) =>
    mocks.useBarberAppointments(...args),
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
  BarberStatsCards: ({
    hideValues,
    todayCount,
    todayRevenue,
    weekCount,
    weekRevenue,
  }: {
    hideValues: boolean;
    todayCount: number;
    todayRevenue: number;
    weekCount: number;
    weekRevenue: number;
  }) => (
    <div data-testid="stats-cards">
      {hideValues ? "hidden" : "visible"}:{todayCount}:{todayRevenue}:
      {weekCount}:{weekRevenue}
    </div>
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
    parseDateString: (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    },
  };
});

describe("BarberDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appointmentsState.isLoading = false;
    mocks.absencesState.isLoading = false;
    mocks.useBarberAppointments.mockImplementation(
      () => mocks.appointmentsState,
    );
    mocks.cancelMutation.mutateAsync.mockResolvedValue(undefined);
    mocks.noShowMutation.mutateAsync.mockResolvedValue(undefined);
    mocks.completeMutation.mutateAsync.mockResolvedValue(undefined);
  });

  it("mostra estado de loading enquanto os dados iniciais carregam", () => {
    mocks.appointmentsState.isLoading = true;
    mocks.appointmentsState.data = [];
    mocks.absencesState.isLoading = true;
    mocks.absencesState.data = [];

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    expect(screen.getByTestId("weekly-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("stats-cards-loading")).toBeInTheDocument();
    expect(screen.getByTestId("daily-schedule-loading")).toBeInTheDocument();
  });

  it("renderiza uma unica instancia de calendario, cards e agenda", () => {
    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(screen.getAllByTestId("weekly-calendar")).toHaveLength(1);
    expect(screen.getAllByTestId("stats-cards")).toHaveLength(1);
    expect(screen.getAllByTestId("daily-schedule")).toHaveLength(1);
  });

  it("renderiza dashboard e alterna o estado de ocultar valores", async () => {
    const user = userEvent.setup();
    mocks.appointmentsState.data = [
      {
        id: "apt-cancelled",
        date: "2026-03-19",
        startTime: "09:00",
        endTime: "09:30",
        status: "CANCELLED_BY_BARBER",
        updatedAt: "2026-03-19T12:00:00.000Z",
        createdAt: "2026-03-19T09:00:00.000Z",
        service: { name: "Corte", price: 50 },
        client: { fullName: "João" },
        guestClient: null,
      },
      {
        id: "apt-1",
        date: "2026-03-19",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-19T12:05:00.000Z",
        createdAt: "2026-03-19T12:05:00.000Z",
        service: { name: "Corte", price: 50 },
        client: { fullName: "João Atualizado" },
        guestClient: null,
      },
    ];

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(screen.getAllByTestId("stats-cards")[0]).toHaveTextContent(
      "visible:1:50:1:50",
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

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

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

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

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

  it("deriva os cards do barbeiro a partir dos agendamentos semanais", () => {
    mocks.appointmentsState.data = [
      {
        id: "apt-today-1",
        date: "2026-03-19",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-19T09:00:00.000Z",
        createdAt: "2026-03-19T09:00:00.000Z",
        service: { id: "svc-1", name: "Corte", duration: 30, price: 50 },
        client: { id: "client-1", fullName: "João", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
      {
        id: "apt-today-2",
        date: "2026-03-19",
        startTime: "11:00",
        endTime: "12:00",
        status: "CONFIRMED",
        updatedAt: "2026-03-19T11:00:00.000Z",
        createdAt: "2026-03-19T11:00:00.000Z",
        service: { id: "svc-2", name: "Barba", duration: 60, price: 70 },
        client: { id: "client-2", fullName: "Pedro", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
      {
        id: "apt-week-1",
        date: "2026-03-20",
        startTime: "10:00",
        endTime: "10:45",
        status: "CONFIRMED",
        updatedAt: "2026-03-20T10:00:00.000Z",
        createdAt: "2026-03-20T10:00:00.000Z",
        service: { id: "svc-3", name: "Pigmentação", duration: 45, price: 60 },
        client: { id: "client-3", fullName: "Marcos", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
      {
        id: "apt-completed",
        date: "2026-03-19",
        startTime: "08:00",
        endTime: "08:30",
        status: "COMPLETED",
        updatedAt: "2026-03-19T08:30:00.000Z",
        createdAt: "2026-03-19T08:00:00.000Z",
        service: { id: "svc-4", name: "Lavagem", duration: 30, price: 30 },
        client: { id: "client-4", fullName: "Bruno", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
    ];

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(screen.getAllByTestId("stats-cards")[0]).toHaveTextContent(
      "visible:2:120:3:180",
    );
  });

  it("mantem os cards ancorados na semana atual ao navegar para outra semana", async () => {
    const user = userEvent.setup();
    const currentWeekAppointments = [
      {
        id: "apt-current",
        date: "2026-03-19",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-19T09:00:00.000Z",
        createdAt: "2026-03-19T09:00:00.000Z",
        service: { id: "svc-1", name: "Corte", duration: 30, price: 50 },
        client: { id: "client-1", fullName: "João", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
    ];
    const nextWeekAppointments = [
      {
        id: "apt-next-1",
        date: "2026-03-26",
        startTime: "10:00",
        endTime: "10:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-26T10:00:00.000Z",
        createdAt: "2026-03-26T10:00:00.000Z",
        service: { id: "svc-2", name: "Barba", duration: 30, price: 80 },
        client: { id: "client-2", fullName: "Pedro", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
      {
        id: "apt-next-2",
        date: "2026-03-27",
        startTime: "11:00",
        endTime: "11:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-27T11:00:00.000Z",
        createdAt: "2026-03-27T11:00:00.000Z",
        service: { id: "svc-3", name: "Pigmentação", duration: 30, price: 100 },
        client: { id: "client-3", fullName: "Marcos", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
    ];

    mocks.useBarberAppointments.mockImplementation(
      (_barberId: string | null, startDate: Date | null) => {
        const startKey = startDate?.toISOString().slice(0, 10);

        if (startKey === "2026-03-22") {
          return { data: nextWeekAppointments, isLoading: false };
        }

        return { data: currentWeekAppointments, isLoading: false };
      },
    );

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(screen.getAllByTestId("stats-cards")[0]).toHaveTextContent(
      "visible:1:50:1:50",
    );

    await user.click(screen.getByText("next-week"));

    expect(screen.getAllByTestId("stats-cards")[0]).toHaveTextContent(
      "visible:1:50:1:50",
    );
  });

  it("mostra skeleton ao voltar para a semana atual enquanto os dados atuais ainda estao refetchando", async () => {
    const user = userEvent.setup();
    const currentWeekAppointments = [
      {
        id: "apt-current",
        date: "2026-03-19",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-19T09:00:00.000Z",
        createdAt: "2026-03-19T09:00:00.000Z",
        service: { id: "svc-1", name: "Corte", duration: 30, price: 50 },
        client: { id: "client-1", fullName: "João", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
    ];
    const nextWeekAppointments = [
      {
        id: "apt-next",
        date: "2026-03-26",
        startTime: "10:00",
        endTime: "10:30",
        status: "CONFIRMED",
        updatedAt: "2026-03-26T10:00:00.000Z",
        createdAt: "2026-03-26T10:00:00.000Z",
        service: { id: "svc-2", name: "Barba", duration: 30, price: 80 },
        client: { id: "client-2", fullName: "Pedro", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
    ];
    let phase: "current" | "next" | "returning" = "current";

    mocks.useBarberAppointments.mockImplementation(
      (_barberId: string | null, startDate: Date | null) => {
        const startKey = startDate?.toISOString().slice(0, 10);

        if (startKey === "2026-03-22") {
          return {
            data: nextWeekAppointments,
            isLoading: false,
            isFetching: phase === "next",
          };
        }

        if (phase === "returning") {
          return {
            data: nextWeekAppointments,
            isLoading: false,
            isFetching: true,
          };
        }

        return {
          data: currentWeekAppointments,
          isLoading: false,
          isFetching: false,
        };
      },
    );

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    phase = "next";
    await user.click(screen.getByText("next-week"));
    expect(screen.getAllByTestId("stats-cards")[0]).toHaveTextContent(
      "visible:1:50:1:50",
    );

    phase = "returning";
    await user.click(screen.getByText("next-week"));

    expect(screen.getByTestId("stats-cards-loading")).toBeInTheDocument();
    expect(screen.getByTestId("daily-schedule-loading")).toBeInTheDocument();
  });
});
