import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DailySchedule } from "../DailySchedule";
import type { BarberWorkingHoursDay } from "@/types/booking";

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

describe("DailySchedule - fluxo de navegação", () => {
  const mockOnCreateAppointment = vi.fn();
  const mockOnCreateAbsence = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe feedback visual (loading) no chip antes de chamar callback", async () => {
    const user = userEvent.setup();

    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={mockOnCreateAppointment}
        onCreateAbsenceFromSlot={mockOnCreateAbsence}
      />,
    );

    const [firstAddButton] = screen.getAllByRole("button", {
      name: "Adicionar",
    });
    await user.click(firstAddButton);

    expect(screen.getByText(/Adicionar em 09:00/)).toBeInTheDocument();

    const timeChip = screen.getByRole("button", { name: "09:00" });
    await user.click(timeChip);

    await waitFor(() => {
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockOnCreateAppointment).toHaveBeenCalledWith("09:00");
    });
  });

  it("desabilita todos os chips enquanto navega", async () => {
    const user = userEvent.setup();

    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={mockOnCreateAppointment}
        onCreateAbsenceFromSlot={mockOnCreateAbsence}
      />,
    );

    const [firstAddButton] = screen.getAllByRole("button", {
      name: "Adicionar",
    });
    await user.click(firstAddButton);

    const timeChip09 = screen.getByRole("button", { name: "09:00" });
    await user.click(timeChip09);

    const timeChip0915 = screen.getByRole("button", { name: "09:15" });
    expect(timeChip0915).toBeDisabled();
  });

  it("chama onCreateAppointmentFromSlot com horário correto do segundo chip", async () => {
    const user = userEvent.setup();

    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={mockOnCreateAppointment}
        onCreateAbsenceFromSlot={mockOnCreateAbsence}
      />,
    );

    const [firstAddButton] = screen.getAllByRole("button", {
      name: "Adicionar",
    });
    await user.click(firstAddButton);

    await user.click(screen.getByRole("button", { name: "09:15" }));

    await waitFor(() => {
      expect(mockOnCreateAppointment).toHaveBeenCalledWith("09:15");
    });
  });

  it("não chama callback de agendamento ao clicar em bloquear", async () => {
    const user = userEvent.setup();

    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={mockOnCreateAppointment}
        onCreateAbsenceFromSlot={mockOnCreateAbsence}
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
      expect(mockOnCreateAbsence).toHaveBeenCalledWith("09:00", "09:30");
    });
    expect(mockOnCreateAppointment).not.toHaveBeenCalled();
  });

  it("sheet fecha após seleção de horário", async () => {
    const user = userEvent.setup();

    render(
      <DailySchedule
        date={new Date("2026-02-23T12:00:00.000Z")}
        appointments={[]}
        absences={[]}
        onCancelAppointment={vi.fn()}
        variant="compact"
        workingHours={workingHours}
        onCreateAppointmentFromSlot={mockOnCreateAppointment}
        onCreateAbsenceFromSlot={mockOnCreateAbsence}
      />,
    );

    const [firstAddButton] = screen.getAllByRole("button", {
      name: "Adicionar",
    });
    await user.click(firstAddButton);

    expect(screen.getByText(/Adicionar em 09:00/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "09:00" }));

    await waitFor(() => {
      expect(mockOnCreateAppointment).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Adicionar em 09:00/)).not.toBeInTheDocument();
    });
  });
});
