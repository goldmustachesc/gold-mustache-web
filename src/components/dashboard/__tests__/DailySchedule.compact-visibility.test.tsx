import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DailySchedule } from "../DailySchedule";
import type {
  AppointmentWithDetails,
  BarberAbsenceData,
  BarberWorkingHoursDay,
} from "@/types/booking";

vi.mock("@/components/barber/AppointmentDetailSheet", () => ({
  AppointmentDetailSheet: () => null,
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsDesktop: () => false,
}));

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: "client-1",
    guestClientId: null,
    barberId: "barber-1",
    serviceId: "service-1",
    date: "2026-04-01",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    cancelReason: null,
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
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
      name: "Barba",
      duration: 15,
      price: 30,
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
    date: "2026-04-01",
    startTime: null,
    endTime: null,
    reason: null,
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("DailySchedule compact - visibilidade operacional", () => {
  it("mostra o intervalo livre real entre atendimentos no fluxo principal da agenda", () => {
    const workingHours: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: "09:00",
      endTime: "10:30",
      breakStart: null,
      breakEnd: null,
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[
          buildAppointment({
            id: "apt-first",
            startTime: "09:00",
            endTime: "09:15",
            client: {
              id: "client-first",
              fullName: "Leo test 0104",
              phone: "11999990000",
            },
          }),
          buildAppointment({
            id: "apt-second",
            startTime: "09:45",
            endTime: "10:00",
            client: {
              id: "client-second",
              fullName: "Guest Smoke Test",
              phone: "11999991111",
            },
          }),
        ]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={vi.fn()}
        onCreateAbsenceFromSlot={vi.fn()}
      />,
    );

    expect(screen.getByText("Leo test 0104")).toBeInTheDocument();
    expect(screen.getByText("Guest Smoke Test")).toBeInTheDocument();
    expect(screen.getByText("09:15 - 09:45")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 10:30")).toBeInTheDocument();
    expect(screen.getByText(/2 intervalos livres/)).toBeInTheDocument();
  });

  it("mantém um período livre longo como um único intervalo real", () => {
    const workingHours: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={vi.fn()}
        onCreateAbsenceFromSlot={vi.fn()}
      />,
    );

    expect(screen.getByText(/1 intervalo livre/)).toBeInTheDocument();
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
  });

  it("não exibe linhas durante a pausa do expediente", () => {
    const workingHours: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: "09:00",
      endTime: "12:00",
      breakStart: "10:00",
      breakEnd: "11:00",
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={vi.fn()}
        onCreateAbsenceFromSlot={vi.fn()}
      />,
    );

    expect(screen.getByText(/2 intervalos livres/)).toBeInTheDocument();
    expect(screen.queryByText("10:00 - 11:00")).not.toBeInTheDocument();
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(screen.getByText("11:00 - 12:00")).toBeInTheDocument();
  });

  it("não mistura expediente não configurado com estado de dia livre", () => {
    const workingHours: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: null,
      endTime: null,
      breakStart: null,
      breakEnd: null,
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
      />,
    );

    expect(
      screen.getByText(
        "Expediente não configurado para exibir os horários livres deste dia.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dia livre!")).not.toBeInTheDocument();
  });

  it("exibe ausência parcial como slots bloqueados separados", () => {
    const workingHours: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[]}
        absences={[
          buildAbsence({
            startTime: "09:15",
            endTime: "09:45",
            reason: "Treinamento",
          }),
        ]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={vi.fn()}
        onCreateAbsenceFromSlot={vi.fn()}
      />,
    );

    expect(screen.getByText("09:00 - 09:15")).toBeInTheDocument();
    expect(screen.getByText("09:15 - 09:45")).toBeInTheDocument();
    expect(screen.getByText("09:45 - 10:00")).toBeInTheDocument();
    expect(screen.getAllByText("Bloqueado por ausência")).toHaveLength(1);
  });

  it("mantém visível um atendimento curto fora do alinhamento de 30 minutos", () => {
    const workingHours: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: "09:00",
      endTime: "10:30",
      breakStart: null,
      breakEnd: null,
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[
          buildAppointment({
            id: "apt-short",
            startTime: "09:45",
            endTime: "10:00",
            client: {
              id: "client-short",
              fullName: "Cliente Curto",
              phone: "11988887777",
            },
          }),
        ]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
      />,
    );

    expect(screen.getByText("Cliente Curto")).toBeInTheDocument();
    expect(screen.getByText("09:45 - 10:00")).toBeInTheDocument();
  });

  it("mantém atendimentos visíveis mesmo em dia de folga", () => {
    const dayOff: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: false,
      startTime: null,
      endTime: null,
      breakStart: null,
      breakEnd: null,
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[
          buildAppointment({
            id: "apt-day-off",
            client: {
              id: "client-day-off",
              fullName: "Cliente em Folga",
              phone: "11977776666",
            },
          }),
        ]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={dayOff}
      />,
    );

    expect(screen.getByText("Cliente em Folga")).toBeInTheDocument();
    expect(screen.getByText("Dia de folga")).toBeInTheDocument();
  });

  it("mantém atendimentos visíveis com ausência de dia inteiro", () => {
    const workingHours: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: "09:00",
      endTime: "10:30",
      breakStart: null,
      breakEnd: null,
    };

    render(
      <DailySchedule
        date={new Date("2026-04-01T12:00:00.000Z")}
        appointments={[
          buildAppointment({
            id: "apt-absence",
            client: {
              id: "client-absence",
              fullName: "Cliente com Ausência",
              phone: "11966665555",
            },
          }),
        ]}
        absences={[buildAbsence({ reason: "Compromisso pessoal" })]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
      />,
    );

    expect(
      screen.getByText("Agenda bloqueada por ausência"),
    ).toBeInTheDocument();
    expect(screen.getByText("Cliente com Ausência")).toBeInTheDocument();
  });
});
