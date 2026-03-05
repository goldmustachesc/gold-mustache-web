import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeSlotGrid } from "../TimeSlotGrid";
import type { TimeSlot } from "@/types/booking";

const slots: TimeSlot[] = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: false },
];

describe("TimeSlotGrid", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <TimeSlotGrid
        slots={[]}
        selectedSlot={null}
        onSelect={vi.fn()}
        isLoading
      />,
    );
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(8);
  });

  it("renders empty state when no slots", () => {
    render(<TimeSlotGrid slots={[]} selectedSlot={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/Nenhum horário disponível/)).toBeInTheDocument();
  });

  it("separates available and unavailable slots", () => {
    render(
      <TimeSlotGrid slots={slots} selectedSlot={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("Horários disponíveis (2)")).toBeInTheDocument();
    expect(screen.getByText("Horários ocupados (1)")).toBeInTheDocument();
  });

  it("renders slot times", () => {
    render(
      <TimeSlotGrid slots={slots} selectedSlot={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("calls onSelect when available slot is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TimeSlotGrid slots={slots} selectedSlot={null} onSelect={onSelect} />,
    );

    await user.click(screen.getByText("09:00"));
    expect(onSelect).toHaveBeenCalledWith(slots[0]);
  });

  it("disables unavailable slot buttons", () => {
    render(
      <TimeSlotGrid slots={slots} selectedSlot={null} onSelect={vi.fn()} />,
    );
    const unavailableBtn = screen.getByText("10:00");
    expect(unavailableBtn.closest("button")).toBeDisabled();
  });

  it("does not show unavailable section when all slots are available", () => {
    const allAvailable = [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
    ];
    render(
      <TimeSlotGrid
        slots={allAvailable}
        selectedSlot={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Horários ocupados/)).not.toBeInTheDocument();
  });
});
