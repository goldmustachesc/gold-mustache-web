import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimeSlotsSection } from "../TimeSlotsSection";
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

  it("calls onSelect when exact time input changes", async () => {
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
      target: { value: "09:45" },
    });
    expect(onSelect).toHaveBeenLastCalledWith("09:45");
  });

  it("shows duration in subtitle when service is selected", () => {
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
    expect(screen.getByText("Duração: 30 min")).toBeInTheDocument();
  });

  it("shows validation error when selected time is outside availability windows", () => {
    render(
      <TimeSlotsSection
        availability={AVAILABILITY}
        selectedTime="10:10"
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
        selectedTimeError="Escolha um horário dentro das janelas disponíveis."
      />,
    );

    expect(
      screen.getByText("Escolha um horário dentro das janelas disponíveis."),
    ).toBeInTheDocument();
  });
});
