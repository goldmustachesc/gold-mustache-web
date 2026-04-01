import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppointmentWithDetails,
  BarberAbsenceData,
} from "@/types/booking";
import { DailySchedule } from "../DailySchedule";

const mockGetMinutesUntilAppointment = vi.hoisted(() => vi.fn(() => 30));
const mockPrompt = vi.hoisted(() => vi.fn());

vi.mock("@/utils/time-slots", async () => {
  const actual =
    await vi.importActual<typeof import("@/utils/time-slots")>(
      "@/utils/time-slots",
    );

  return {
    ...actual,
    getMinutesUntilAppointment: (...args: unknown[]) =>
      mockGetMinutesUntilAppointment(...args),
  };
});

vi.mock("@/components/barber/AppointmentDetailSheet", () => ({
  AppointmentDetailSheet: () => null,
}));

vi.stubGlobal("prompt", mockPrompt);

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: "client-1",
    guestClientId: null,
    barberId: "barber-1",
    serviceId: "service-1",
    date: "2026-03-19",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    cancelReason: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    client: {
      id: "client-1",
      fullName: "João Silva",
      phone: "11999999999",
    },
    guestClient: null,
    barber: {
      id: "barber-1",
      name: "Carlos",
      avatarUrl: null,
    },
    service: {
      id: "service-1",
      name: "Corte",
      duration: 30,
      price: 50,
    },
    ...overrides,
  };
}

function buildAbsence(
  overrides: Partial<BarberAbsenceData> = {},
): BarberAbsenceData {
  return {
    id: "absence-1",
    barberId: "barber-1",
    date: "2026-03-19",
    startTime: null,
    endTime: null,
    reason: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("DailySchedule default", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMinutesUntilAppointment.mockReturnValue(30);
    mockPrompt.mockReset();
  });

  it("mostra dia livre quando nao ha agendamentos nem ausencia", () => {
    render(
      <DailySchedule
        date={new Date("2026-03-19T12:00:00.000Z")}
        appointments={[]}
        onCancelAppointment={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Nenhum agendamento para este dia"),
    ).toBeInTheDocument();
    expect(screen.getByText("Dia livre!")).toBeInTheDocument();
  });

  it("mostra agenda bloqueada quando existe ausencia de dia inteiro", () => {
    render(
      <DailySchedule
        date={new Date("2026-03-19T12:00:00.000Z")}
        appointments={[]}
        absences={[buildAbsence({ reason: "Folga" })]}
        onCancelAppointment={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Agenda bloqueada por ausência"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Agenda bloqueada por ausência."),
    ).toBeInTheDocument();
  });

  it("permite cancelar um agendamento futuro no layout default", async () => {
    const user = userEvent.setup();
    const onCancelAppointment = vi.fn();
    mockPrompt.mockReturnValue("Cliente pediu cancelamento");

    render(
      <DailySchedule
        date={new Date("2026-03-19T12:00:00.000Z")}
        appointments={[buildAppointment()]}
        onCancelAppointment={onCancelAppointment}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mockPrompt).toHaveBeenCalledWith("Motivo do cancelamento:");
    expect(onCancelAppointment).toHaveBeenCalledWith(
      "apt-1",
      "Cliente pediu cancelamento",
    );
  });

  it("permite concluir e marcar no-show em agendamento passado", async () => {
    const user = userEvent.setup();
    const onMarkComplete = vi.fn();
    const onMarkNoShow = vi.fn();
    mockGetMinutesUntilAppointment.mockReturnValue(-5);

    render(
      <DailySchedule
        date={new Date("2026-03-19T12:00:00.000Z")}
        appointments={[buildAppointment()]}
        onCancelAppointment={vi.fn()}
        onMarkComplete={onMarkComplete}
        onMarkNoShow={onMarkNoShow}
        hideValues
      />,
    );

    expect(screen.getByText("R$ ***,**")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Concluir" }).className,
    ).toContain("border-success/30");
    expect(
      screen.getByRole("button", { name: "Não compareceu" }).className,
    ).toContain("border-warning/30");

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await user.click(screen.getByRole("button", { name: "Não compareceu" }));

    expect(onMarkComplete).toHaveBeenCalledWith("apt-1");
    expect(onMarkNoShow).toHaveBeenCalledWith("apt-1");
  });

  it("mostra link de telefone para guest em no-show", () => {
    render(
      <DailySchedule
        date={new Date("2026-03-19T12:00:00.000Z")}
        appointments={[
          buildAppointment({
            clientId: null,
            guestClientId: "guest-1",
            status: "NO_SHOW",
            client: null,
            guestClient: {
              id: "guest-1",
              fullName: "Pedro Guest",
              phone: "11888888888",
            },
          }),
        ]}
        onCancelAppointment={vi.fn()}
      />,
    );

    expect(screen.getByText("Não compareceu").className).toContain(
      "bg-warning",
    );
    expect(screen.getByText("Não compareceu").className).toContain(
      "text-warning-foreground",
    );
    expect(screen.getByRole("link", { name: /ligar/i })).toHaveAttribute(
      "href",
      "tel:11888888888",
    );
  });

  it("mostra labels de status para completed e no-show no layout default", () => {
    mockGetMinutesUntilAppointment.mockReturnValue(-5);

    render(
      <DailySchedule
        date={new Date("2026-03-19T12:00:00.000Z")}
        appointments={[
          buildAppointment({
            id: "apt-completed",
            status: "COMPLETED",
            client: {
              id: "client-completed",
              fullName: "Leo test 0104",
              phone: "11999999999",
            },
          }),
          buildAppointment({
            id: "apt-no-show",
            startTime: "10:00",
            endTime: "10:30",
            status: "NO_SHOW",
            client: {
              id: "client-no-show",
              fullName: "Cliente Faltou",
              phone: "11888888888",
            },
          }),
        ]}
        onCancelAppointment={vi.fn()}
      />,
    );

    expect(screen.getByText("Concluído").className).toContain("bg-success/15");
    expect(screen.getByText("Concluído").className).toContain(
      "text-foreground",
    );
    expect(screen.getByText("Não compareceu").className).toContain(
      "bg-warning",
    );
    expect(screen.getByText("Não compareceu").className).toContain(
      "text-warning-foreground",
    );
    expect(
      screen.queryByRole("button", { name: "Concluir" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Não compareceu" }),
    ).not.toBeInTheDocument();
  });
});
