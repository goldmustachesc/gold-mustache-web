import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WeeklyCalendar } from "../WeeklyCalendar";
import type { AppointmentWithDetails } from "@/types/booking";

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: "client-1",
    guestClientId: null,
    barberId: "barber-1",
    serviceId: "service-1",
    date: "2026-02-23",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    cancelReason: null,
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
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

describe("WeeklyCalendar - indicador de ausência", () => {
  it("exibe indicador visual para dias com ausência", () => {
    render(
      <WeeklyCalendar
        weekStart={new Date("2026-02-22T12:00:00.000Z")}
        appointments={[]}
        absenceDates={["2026-02-23"]}
        selectedDate={new Date("2026-02-23T12:00:00.000Z")}
        onDateSelect={vi.fn()}
        onWeekChange={vi.fn()}
        variant="compact"
      />,
    );

    expect(screen.getAllByTestId("has-absence-indicator")).toHaveLength(1);
  });

  it("não exibe indicador de ausência quando não há ausências", () => {
    render(
      <WeeklyCalendar
        weekStart={new Date("2026-02-22T12:00:00.000Z")}
        appointments={[]}
        absenceDates={[]}
        selectedDate={new Date("2026-02-23T12:00:00.000Z")}
        onDateSelect={vi.fn()}
        onWeekChange={vi.fn()}
        variant="compact"
      />,
    );

    expect(
      screen.queryByTestId("has-absence-indicator"),
    ).not.toBeInTheDocument();
  });

  it("mostra uma faixa semanal curta e continua sinalizando agendamentos e ausências", () => {
    render(
      <WeeklyCalendar
        weekStart={new Date("2026-02-22T12:00:00.000Z")}
        appointments={[buildAppointment()]}
        absenceDates={["2026-02-23"]}
        selectedDate={new Date("2026-02-23T12:00:00.000Z")}
        onDateSelect={vi.fn()}
        onWeekChange={vi.fn()}
        variant="compact"
      />,
    );

    expect(screen.getByText("22 fev a 28 fev")).toBeInTheDocument();
    expect(screen.getAllByTestId("has-appointments-indicator")).toHaveLength(1);
    expect(screen.getAllByTestId("has-absence-indicator")).toHaveLength(1);
  });

  it("mostra range compacto, indicador de agendamento e dispara callbacks", async () => {
    const user = userEvent.setup();
    const onDateSelect = vi.fn();
    const onWeekChange = vi.fn();

    render(
      <WeeklyCalendar
        weekStart={new Date("2026-02-22T12:00:00.000Z")}
        appointments={[buildAppointment()]}
        absenceDates={["2026-02-23"]}
        selectedDate={new Date("2026-02-23T12:00:00.000Z")}
        onDateSelect={onDateSelect}
        onWeekChange={onWeekChange}
        variant="compact"
      />,
    );

    expect(screen.getByText("22 fev a 28 fev")).toBeInTheDocument();
    expect(screen.getAllByTestId("has-appointments-indicator")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Semana anterior" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Próxima semana" }),
    ).toBeInTheDocument();

    const compactButtons = screen.getAllByRole("button");
    const firstDayButton = screen.getByText("DOM").closest("button");

    expect(firstDayButton).not.toBeNull();

    await user.click(compactButtons[0]);
    await user.click(firstDayButton as HTMLButtonElement);

    expect(onWeekChange).toHaveBeenCalledWith("prev");
    expect(onDateSelect).toHaveBeenCalled();
  });

  it("renderiza layout default com contagem, ausência e navegação semanal", async () => {
    const user = userEvent.setup();
    const onDateSelect = vi.fn();
    const onWeekChange = vi.fn();

    render(
      <WeeklyCalendar
        weekStart={new Date("2026-02-22T12:00:00.000Z")}
        appointments={[
          buildAppointment(),
          buildAppointment({
            id: "apt-2",
            date: "2026-02-23",
            startTime: "10:00",
            endTime: "10:30",
          }),
        ]}
        absenceDates={["2026-02-24"]}
        selectedDate={new Date("2026-02-24T12:00:00.000Z")}
        onDateSelect={onDateSelect}
        onWeekChange={onWeekChange}
      />,
    );

    expect(screen.getByText("22/02/2026 - 28/02/2026")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByTestId("has-absence-indicator")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    await user.click(screen.getByText("24"));

    expect(onWeekChange).toHaveBeenCalledWith("prev");
    expect(onWeekChange).toHaveBeenCalledWith("next");
    expect(onDateSelect).toHaveBeenCalled();
  });
});
