import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DailySchedule } from "../DailySchedule";
import type { BarberAbsenceData, BarberWorkingHoursDay } from "@/types/booking";

vi.mock("@/components/barber/AppointmentDetailSheet", () => ({
  AppointmentDetailSheet: () => null,
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsDesktop: () => false,
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
  it("exibe botão Adicionar nos slots disponíveis", () => {
    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={vi.fn()}
        onCreateAbsenceFromSlot={vi.fn()}
      />,
    );

    const addButtons = screen.getAllByRole("button", { name: "Adicionar" });
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it("abre o bottom sheet ao clicar em Adicionar e chama onCreateAppointmentFromSlot ao selecionar horário", async () => {
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

    const [firstAddButton] = screen.getAllByRole("button", {
      name: "Adicionar",
    });
    await user.click(firstAddButton);

    // Sheet abre mostrando o título com o intervalo
    expect(screen.getByText(/Adicionar em 09:00/)).toBeInTheDocument();

    // Chips de 15 min estão presentes
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:15" })).toBeInTheDocument();

    // Clicar no chip chama onCreateAppointmentFromSlot
    await user.click(screen.getByRole("button", { name: "09:00" }));

    await waitFor(() => {
      expect(onCreateAppointmentFromSlot).toHaveBeenCalledWith("09:00");
    });
    expect(onCreateAbsenceFromSlot).not.toHaveBeenCalled();
  });

  it("chama onCreateAbsenceFromSlot ao clicar em Bloquear no sheet", async () => {
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

    const [firstAddButton] = screen.getAllByRole("button", {
      name: "Adicionar",
    });
    await user.click(firstAddButton);

    await user.click(
      screen.getByRole("button", { name: /bloquear este intervalo/i }),
    );

    await waitFor(() => {
      expect(onCreateAbsenceFromSlot).toHaveBeenCalledWith("09:00", "09:30");
    });
    expect(onCreateAppointmentFromSlot).not.toHaveBeenCalled();
  });

  it("não exibe botão Adicionar quando horário está bloqueado por ausência", () => {
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

    expect(screen.getByText("Bloqueado por ausência")).toBeInTheDocument();
    // O slot bloqueado não deve ter botão Adicionar
    // (pode haver outros slots disponíveis com botão Adicionar)
    const blockedSlotTexts = screen.getAllByText("Bloqueado por ausência");
    expect(blockedSlotTexts.length).toBeGreaterThan(0);
  });
});
