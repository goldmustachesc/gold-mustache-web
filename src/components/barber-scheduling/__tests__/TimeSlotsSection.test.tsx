import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeSlotsSection } from "../TimeSlotsSection";
import type { TimeSlot } from "@/types/booking";

const SLOTS: TimeSlot[] = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: true },
];

describe("TimeSlotsSection", () => {
  it("renders section title", () => {
    render(
      <TimeSlotsSection
        slots={SLOTS}
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
        slots={[]}
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
        slots={[]}
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
        slots={[]}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
      />,
    );
    expect(screen.getByText("Nenhum horário disponível")).toBeInTheDocument();
  });

  it("renders time slot buttons", () => {
    render(
      <TimeSlotsSection
        slots={SLOTS}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
      />,
    );
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("calls onSelect when slot clicked", async () => {
    const onSelect = vi.fn();
    render(
      <TimeSlotsSection
        slots={SLOTS}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={onSelect}
        serviceDuration={30}
      />,
    );

    await userEvent.click(screen.getByText("09:30"));
    expect(onSelect).toHaveBeenCalledWith("09:30");
  });

  it("shows duration in subtitle when service is selected", () => {
    render(
      <TimeSlotsSection
        slots={SLOTS}
        selectedTime=""
        loading={false}
        serviceSelected={true}
        onSelect={vi.fn()}
        serviceDuration={30}
      />,
    );
    expect(screen.getByText("Duração: 30 min")).toBeInTheDocument();
  });
});
