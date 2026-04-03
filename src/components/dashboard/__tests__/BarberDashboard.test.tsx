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
  desktopSidebarProps: vi.fn(),
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

vi.mock("../BarberDashboardHero", () => ({
  BarberDashboardHero: ({ hideValues }: { hideValues: boolean }) => (
    <div data-testid="barber-dashboard-hero">
      {hideValues ? "hero-hidden" : "hero-visible"}
    </div>
  ),
}));

vi.mock("../BarberDashboardDesktopSidebar", () => ({
  BarberDashboardDesktopSidebar: (props: unknown) => {
    mocks.desktopSidebarProps(props);
    return (
      <div data-testid="barber-dashboard-desktop-sidebar">desktop-sidebar</div>
    );
  },
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
    onCancelAppointment: (id: string, reason: string) => Promise<boolean>;
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

/** Alinha o “hoje” de `formatIsoDateYyyyMmDdInSaoPaulo(operationalNow)` ao mesmo dia fixo de `getBrazilDateString` acima. */
vi.mock("@/utils/datetime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/datetime")>();
  const frozenTestToday = "2026-03-19";
  return {
    ...actual,
    formatIsoDateYyyyMmDdInSaoPaulo: (date: Date) => {
      const todayReal = actual.formatIsoDateYyyyMmDdInSaoPaulo(new Date());
      const requested = actual.formatIsoDateYyyyMmDdInSaoPaulo(date);
      if (requested === todayReal) {
        return frozenTestToday;
      }
      return requested;
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
    expect(
      screen.getByTestId("barber-dashboard-desktop-sidebar-skeleton"),
    ).toBeInTheDocument();
  });

  it("renderiza uma unica instancia de calendario, cards e agenda", () => {
    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(screen.getAllByTestId("weekly-calendar")).toHaveLength(1);
    expect(screen.getAllByTestId("stats-cards")).toHaveLength(1);
    expect(screen.getAllByTestId("daily-schedule")).toHaveLength(1);
    expect(screen.getAllByTestId("barber-dashboard-hero")).toHaveLength(1);
  });

  it("no mobile, renderiza o hero antes do calendario na ordem do DOM", () => {
    const { container } = render(
      <BarberDashboard barberProfile={barberProfile} locale="pt-BR" />,
    );

    const hero = container.querySelector(
      '[data-testid="barber-dashboard-hero"]',
    );
    const calendar = container.querySelector('[data-testid="weekly-calendar"]');

    expect(hero).toBeTruthy();
    expect(calendar).toBeTruthy();
    if (!hero || !calendar) {
      throw new Error("hero e calendario devem existir no DOM");
    }
    expect(
      hero.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("mostra o titulo explicito da agenda do dia", () => {
    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(
      screen.getByRole("heading", { name: "Agenda do dia" }),
    ).toBeInTheDocument();
  });

  it("exibe camada secundária com atalhos mínimos do hub", () => {
    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(
      screen.getByTestId("barber-dashboard-secondary"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Agendar cliente/i }),
    ).toHaveAttribute("href", "/pt-BR/barbeiro/agendar");
    expect(screen.getByRole("link", { name: /^Clientes$/i })).toHaveAttribute(
      "href",
      "/pt-BR/barbeiro/clientes",
    );
    expect(screen.getByRole("link", { name: /^Ausências$/i })).toHaveAttribute(
      "href",
      "/pt-BR/barbeiro/ausencias?date=2026-03-19",
    );
    expect(screen.getByRole("link", { name: /^Horários$/i })).toHaveAttribute(
      "href",
      "/pt-BR/barbeiro/horarios",
    );
  });

  it("renderiza painel lateral de apoio no desktop e mantém a camada secundária mobile separada", () => {
    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    expect(
      screen.getByTestId("barber-dashboard-desktop-sidebar"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("barber-dashboard-mobile-secondary")).toHaveClass(
      "ipad:hidden",
      "lg:hidden",
    );
  });

  it("alinha a lateral desktop ao dia e à semana selecionados", async () => {
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
    const selectedWeekAppointments = [
      {
        id: "apt-selected",
        date: "2026-03-26",
        startTime: "13:00",
        endTime: "14:00",
        status: "CONFIRMED",
        updatedAt: "2026-03-26T13:00:00.000Z",
        createdAt: "2026-03-26T13:00:00.000Z",
        service: {
          id: "svc-2",
          name: "Corte + Barba",
          duration: 60,
          price: 90,
        },
        client: { id: "client-2", fullName: "Pedro", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
    ];

    mocks.useBarberAppointments.mockImplementation(
      (_barberId: string, weekStart: Date) => {
        const weekStartLabel = weekStart.toISOString().slice(0, 10);

        if (weekStartLabel === "2026-03-22") {
          return { data: selectedWeekAppointments, isLoading: false };
        }

        return { data: currentWeekAppointments, isLoading: false };
      },
    );

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    await user.click(screen.getByRole("button", { name: "next-week" }));

    await waitFor(() => {
      const latestProps = mocks.desktopSidebarProps.mock.calls.at(-1)?.[0] as {
        dailyAppointmentsCount: number;
        dayRevenue: number;
        weekRevenue: number;
      };

      expect(latestProps.dailyAppointmentsCount).toBe(1);
      expect(latestProps.dayRevenue).toBe(90);
      expect(latestProps.weekRevenue).toBe(90);
    });
  });

  it("no mobile, coloca a agenda antes das métricas na ordem do DOM", () => {
    const { container } = render(
      <BarberDashboard barberProfile={barberProfile} locale="pt-BR" />,
    );

    const agenda = container.querySelector("#agenda-do-dia");
    const stats = container.querySelector('[data-testid="stats-cards"]');

    expect(agenda).toBeTruthy();
    expect(stats).toBeTruthy();
    if (!agenda || !stats) {
      throw new Error("agenda e stats devem existir");
    }

    expect(
      agenda.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("mantem o mobile por DOM e usa a grade desktop para distribuir hero, lateral e agenda", () => {
    const { container } = render(
      <BarberDashboard barberProfile={barberProfile} locale="pt-BR" />,
    );

    const layoutRoot = container.querySelector("main > div");
    const heroWrapper = screen.getByTestId(
      "barber-dashboard-hero",
    ).parentElement;
    const calendarWrapper =
      screen.getByTestId("weekly-calendar").parentElement?.parentElement
        ?.parentElement;
    const calendarStickyWrapper =
      screen.getByTestId("weekly-calendar").parentElement?.parentElement;
    const desktopSidebarWrapper = screen.getByTestId(
      "barber-dashboard-desktop-sidebar",
    ).parentElement;
    const agendaWrapper =
      container.querySelector("#agenda-do-dia")?.parentElement;
    const secondaryWrapper = screen.getByTestId(
      "barber-dashboard-secondary",
    ).parentElement;

    expect(layoutRoot).toBeTruthy();
    expect(heroWrapper).toBeTruthy();
    expect(calendarWrapper).toBeTruthy();
    expect(desktopSidebarWrapper).toBeTruthy();
    expect(agendaWrapper).toBeTruthy();
    expect(secondaryWrapper).toBeTruthy();

    for (const element of [
      heroWrapper,
      calendarWrapper,
      agendaWrapper,
      secondaryWrapper,
    ]) {
      expect(element?.className).not.toMatch(/(^|\s)order-\d+/);
    }

    expect(heroWrapper).toBe(agendaWrapper);
    expect(layoutRoot?.className).toContain("lg:grid");
    expect(layoutRoot?.className).toContain("lg:grid-cols-10");
    expect(heroWrapper?.className).toContain("space-y-4");
    expect(heroWrapper?.className).toContain("ipad:col-span-5");
    expect(heroWrapper?.className).toContain("lg:col-span-6");
    expect(heroWrapper?.className).toContain("xl:col-span-8");
    expect(calendarWrapper?.className).toContain("ipad:col-span-3");
    expect(calendarWrapper?.className).toContain("lg:col-span-4");
    expect(calendarWrapper?.className).toContain("xl:row-span-2");
    expect(calendarStickyWrapper?.className).toContain("ipad:top-20");
    expect(calendarStickyWrapper?.className).toContain("lg:sticky");
    expect(calendarStickyWrapper?.className).toContain("lg:top-20");
    expect(calendarStickyWrapper?.className).toContain("xl:top-24");
    expect(desktopSidebarWrapper?.className).toContain("lg:block");
    expect(secondaryWrapper?.className).toContain("ipad:hidden");
    expect(secondaryWrapper?.className).toContain("lg:hidden");
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
    expect(screen.getAllByTestId("barber-dashboard-hero")[0]).toHaveTextContent(
      "hero-hidden",
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

  it("ignora status não confirmados na receita da lateral desktop", () => {
    mocks.appointmentsState.data = [
      {
        id: "apt-confirmed",
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
        id: "apt-completed",
        date: "2026-03-19",
        startTime: "10:00",
        endTime: "10:30",
        status: "COMPLETED",
        updatedAt: "2026-03-19T10:30:00.000Z",
        createdAt: "2026-03-19T10:00:00.000Z",
        service: { id: "svc-2", name: "Barba", duration: 30, price: 30 },
        client: { id: "client-2", fullName: "Pedro", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
      {
        id: "apt-cancelled",
        date: "2026-03-20",
        startTime: "11:00",
        endTime: "11:30",
        status: "CANCELLED_BY_BARBER",
        updatedAt: "2026-03-20T11:15:00.000Z",
        createdAt: "2026-03-20T11:00:00.000Z",
        service: { id: "svc-3", name: "Pigmentação", duration: 30, price: 80 },
        client: { id: "client-3", fullName: "Marcos", phone: null },
        guestClient: null,
        barber: { id: "barber-1", name: "Carlos Silva", avatarUrl: null },
      },
    ];

    render(<BarberDashboard barberProfile={barberProfile} locale="pt-BR" />);

    const latestProps = mocks.desktopSidebarProps.mock.calls.at(-1)?.[0] as {
      dayRevenue: number;
      weekRevenue: number;
    };

    expect(latestProps.dayRevenue).toBe(50);
    expect(latestProps.weekRevenue).toBe(50);
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
