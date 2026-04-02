import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DailySchedule } from "../DailySchedule";
import type { BarberAbsenceData, BarberWorkingHoursDay } from "@/types/booking";

vi.mock("@/components/barber/AppointmentDetailSheet", () => ({
  AppointmentDetailSheet: () => null,
}));

const workingHours: BarberWorkingHoursDay = {
  dayOfWeek: 1,
  isWorking: true,
  startTime: "09:00",
  endTime: "10:00",
  breakStart: null,
  breakEnd: null,
};

function buildAbsence(input: Partial<BarberAbsenceData>): BarberAbsenceData {
  return {
    id: "absence-1",
    barberId: "barber-1",
    date: "2026-02-23",
    startTime: null,
    endTime: null,
    reason: null,
    createdAt: "2026-02-20T10:00:00.000Z",
    updatedAt: "2026-02-20T10:00:00.000Z",
    ...input,
  };
}

describe("DailySchedule - vínculo com ausências", () => {
  it("mostra agenda bloqueada quando há ausência de dia inteiro", () => {
    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[buildAbsence({ reason: "Compromisso pessoal" })]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
      />,
    );

    expect(
      screen.getByText("Agenda bloqueada por ausência"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ausência de dia inteiro registrada."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Disponível")).not.toBeInTheDocument();
  });

  it("marca slots como bloqueados quando há ausência parcial", () => {
    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[
          buildAbsence({
            startTime: "09:00",
            endTime: "09:30",
            reason: "Treinamento",
          }),
        ]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
      />,
    );

    expect(
      screen.getByText("Existem horários bloqueados por ausência neste dia."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bloqueado por ausência")).toHaveLength(1);
    expect(screen.getAllByText("Disponível")).toHaveLength(1);
    expect(screen.getAllByText("Treinamento")).toHaveLength(1);
    expect(screen.getByText("09:00 - 09:30")).toBeInTheDocument();
    expect(screen.getByText("09:30 - 10:00")).toBeInTheDocument();
  });
});
