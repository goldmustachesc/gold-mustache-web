import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatTimeSlotSelector } from "../ChatTimeSlotSelector";
import type { TimeSlot } from "@/types/booking";

const slots: TimeSlot[] = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: false },
];

describe("ChatTimeSlotSelector", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <ChatTimeSlotSelector slots={[]} onSelect={vi.fn()} isLoading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when no available slots", () => {
    render(
      <ChatTimeSlotSelector
        slots={[{ time: "10:00", available: false }]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nenhum horário disponível/)).toBeInTheDocument();
  });

  it("renders only available slots as buttons", () => {
    render(<ChatTimeSlotSelector slots={slots} onSelect={vi.fn()} />);
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.queryByText("10:00")).not.toBeInTheDocument();
  });

  it("calls onSelect when slot clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatTimeSlotSelector slots={slots} onSelect={onSelect} />);

    await user.click(screen.getByText("09:00"));
    expect(onSelect).toHaveBeenCalledWith(slots[0]);
  });

  it("shows choose another date button when no slots and onChooseAnotherDate provided", () => {
    render(
      <ChatTimeSlotSelector
        slots={[]}
        onSelect={vi.fn()}
        onChooseAnotherDate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Escolher outra data/)).toBeInTheDocument();
  });

  it("calls onChooseAnotherDate when button clicked", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(
      <ChatTimeSlotSelector
        slots={[]}
        onSelect={vi.fn()}
        onChooseAnotherDate={onChoose}
      />,
    );

    await user.click(screen.getByText(/Escolher outra data/));
    expect(onChoose).toHaveBeenCalledOnce();
  });
});
