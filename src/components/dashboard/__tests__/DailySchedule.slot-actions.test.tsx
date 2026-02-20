import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("DailySchedule - ações em horário disponível", () => {
  it("permite cadastrar atendimento a partir do slot disponível", async () => {
    const user = userEvent.setup();
    const onCreateAppointmentFromSlot = vi.fn();
    const onCreateAbsenceFromSlot = vi.fn();

    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={onCreateAppointmentFromSlot}
        onCreateAbsenceFromSlot={onCreateAbsenceFromSlot}
      />,
    );

    await user.click(screen.getByLabelText("Ações para horário 09:00"));
    await user.click(screen.getByText("Cadastrar atendimento às 09:00"));

    expect(onCreateAppointmentFromSlot).toHaveBeenCalledWith("09:00");
    expect(onCreateAbsenceFromSlot).not.toHaveBeenCalled();
  });

  it("não permite ação de slot quando horário está bloqueado por ausência", () => {
    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[
          buildAbsence({
            startTime: "09:00",
            endTime: "09:30",
            reason: "Compromisso",
          }),
        ]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={vi.fn()}
        onCreateAbsenceFromSlot={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText("Ações para horário 09:00"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Bloqueado por ausência")).toBeInTheDocument();
  });
});
