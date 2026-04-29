import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimeSlotsSection } from "../TimeSlotsSection";
import { buildTimeSelectionFeedback } from "@/lib/booking/time-selection-feedback";
import type { BookingAvailability } from "@/types/booking";

const AVAILABILITY: BookingAvailability = {
  barberId: "barber-1",
  serviceDuration: 30,
  windows: [
    { startTime: "09:00", endTime: "10:00" },
    { startTime: "10:30", endTime: "12:00" },
  ],
};

describe("TimeSlotsSection", () => {
  it("renders section title", () => {
    render(
      <TimeSlotsSection
        availability={AVAILABILITY}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={null}
      />,
    );
    expect(screen.getByText("Horário")).toBeInTheDocument();
  });

  it("shows empty state when no service selected", () => {
    render(
      <TimeSlotsSection
        availability={null}
        selectedTime=""
        loading={false}
        serviceSelected={false}
        onSelect={vi.fn()}
        serviceDuration={null}
      />,
    );
    expect(
      screen.getByText("Selecione um serviço para ver os horários"),
    ).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    const { container } = render(
      <TimeSlotsSection
        availability={null}
        selectedTime=""
        loading={true}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
      />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows no slots message when empty", () => {
    render(
      <TimeSlotsSection
        availability={{
          barberId: "barber-1",
          serviceDuration: 30,
          windows: [],
        }}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
      />,
    );
    expect(screen.getByText("Nenhuma janela disponível")).toBeInTheDocument();
  });

  it("renders the real availability windows", () => {
    render(
      <TimeSlotsSection
        availability={AVAILABILITY}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
      />,
    );
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(screen.getByText("10:30 - 12:00")).toBeInTheDocument();
  });

  it("rounds broken exact time input changes", async () => {
    const onSelect = vi.fn();
    render(
      <TimeSlotsSection
        availability={AVAILABILITY}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={onSelect}
        serviceDuration={30}
      />,
    );

    fireEvent.change(screen.getByLabelText("Escolha o início exato"), {
      target: { value: "09:43" },
    });
    expect(onSelect).toHaveBeenLastCalledWith("09:45");
  });

  it("shows duration in subtitle when service is selected", () => {
    render(
      <TimeSlotsSection
        availability={AVAILABILITY}
        selectedTime="09:00"
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
        selectedTimeFeedback={buildTimeSelectionFeedback({
          windows: AVAILABILITY.windows,
          selectedStartTime: "09:00",
          serviceDurationMinutes: 30,
        })}
      />,
    );
    expect(screen.getByText("Duração: 30 min")).toBeInTheDocument();
    expect(screen.getByText("Horário disponível.")).toBeInTheDocument();
    expect(
      screen.getByText("Atendimento previsto: 09:00 - 09:30."),
    ).toBeInTheDocument();
  });

  it("shows validation error when selected time is outside availability windows", () => {
    const feedback = buildTimeSelectionFeedback({
      windows: AVAILABILITY.windows,
      selectedStartTime: "10:10",
      serviceDurationMinutes: 30,
    });

    render(
      <TimeSlotsSection
        availability={AVAILABILITY}
        selectedTime="10:10"
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
        selectedTimeFeedback={feedback}
      />,
    );

    expect(
      screen.getByText("Esse início não está dentro de uma janela livre."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Próximo início disponível: 10:30."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Usar 10:30" }),
    ).toBeInTheDocument();
  });
});
