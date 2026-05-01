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

  it("shows duration subtitle when service is selected", () => {
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

  it("shows empty state when no slots available", () => {
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
    expect(screen.getByText("Nenhum horário disponível")).toBeInTheDocument();
  });

  it("renders recommended time buttons from availability windows", () => {
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
    expect(screen.getByText("Melhores horários")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:30" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10:30" })).toBeInTheDocument();
  });

  it("calls onSelect when a time button is clicked", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "09:00" }));
    expect(onSelect).toHaveBeenCalledWith("09:00");
  });

  it("shows selected time confirmation when a time is selected", () => {
    render(
      <TimeSlotsSection
        availability={AVAILABILITY}
        selectedTime="09:00"
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
      />,
    );
    expect(screen.getByText("Atendimento: 09:00 - 09:30")).toBeInTheDocument();
  });
});
