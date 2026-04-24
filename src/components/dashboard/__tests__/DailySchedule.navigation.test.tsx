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

    expect(screen.getByText("Adicionar em 09:00 - 10:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnCreateAppointment).toHaveBeenCalledWith("09:00");
    });
  });

  it("desabilita o input e a ação de bloqueio enquanto navega", async () => {
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

    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    await waitFor(() => {
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /bloquear este intervalo/i }),
    ).toBeDisabled();
  });

  it("permite ajustar o horário exato antes de navegar", async () => {
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

    await user.click(screen.getAllByRole("button", { name: "Adicionar" })[0]);
    await user.clear(screen.getByLabelText("Horário de início"));
    await user.type(screen.getByLabelText("Horário de início"), "09:37");
    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    await waitFor(() => {
      expect(mockOnCreateAppointment).toHaveBeenCalledWith("09:37");
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
      expect(mockOnCreateAbsence).toHaveBeenCalledWith("09:00", "10:00");
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

    expect(screen.getByText("Adicionar em 09:00 - 10:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    await waitFor(() => {
      expect(mockOnCreateAppointment).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Adicionar em 09:00 - 10:00"),
      ).not.toBeInTheDocument();
    });
  });
});
