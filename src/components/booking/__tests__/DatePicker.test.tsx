import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "../DatePicker";

const FAKE_TODAY = new Date(2026, 2, 5);

vi.mock("@/hooks/useBrazilToday", () => ({
  useBrazilToday: () => FAKE_TODAY,
}));

describe("DatePicker", () => {
  it("renders current month and year header", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Março 2026")).toBeInTheDocument();
  });

  it("renders weekday headers", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Dom")).toBeInTheDocument();
    expect(screen.getByText("Seg")).toBeInTheDocument();
    expect(screen.getByText("Sáb")).toBeInTheDocument();
  });

  it("renders day numbers for the month", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
  });

  it("disables past dates", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);
    const pastDay = screen.getByText("1");
    expect(pastDay.closest("button")).toBeDisabled();
  });

  it("enables today and future dates within maxDays", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);
    const todayBtn = screen.getByText("5");
    expect(todayBtn.closest("button")).not.toBeDisabled();

    const futureBtn = screen.getByText("10");
    expect(futureBtn.closest("button")).not.toBeDisabled();
  });

  it("calls onSelect when a valid date is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<DatePicker selectedDate={null} onSelect={onSelect} />);

    await user.click(screen.getByText("10"));

    expect(onSelect).toHaveBeenCalledOnce();
    const selected = onSelect.mock.calls[0][0] as Date;
    expect(selected.getDate()).toBe(10);
    expect(selected.getMonth()).toBe(2);
  });

  it("does not call onSelect for disabled dates", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<DatePicker selectedDate={null} onSelect={onSelect} />);

    await user.click(screen.getByText("1"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("disables explicitly disabled dates", () => {
    const disabledDates = [new Date(2026, 2, 10)];

    render(
      <DatePicker
        selectedDate={null}
        onSelect={vi.fn()}
        disabledDates={disabledDates}
      />,
    );

    const disabledDay = screen.getByText("10");
    expect(disabledDay.closest("button")).toBeDisabled();
  });

  it("navigates to next month", async () => {
    const user = userEvent.setup();

    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Março 2026")).toBeInTheDocument();

    const buttons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg") && !b.textContent?.match(/^\d+$/));
    const forwardBtn = buttons[1];

    await user.click(forwardBtn);
    expect(screen.getByText("Abril 2026")).toBeInTheDocument();
  });

  it("disables previous month button when on current month", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);

    const buttons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg") && !b.textContent?.match(/^\d+$/));
    const prevBtn = buttons[0];

    expect(prevBtn).toBeDisabled();
  });

  it("highlights today with a border", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} />);

    const todayBtn = screen.getByText("5").closest("button");
    expect(todayBtn?.className).toContain("border");
  });

  it("highlights selected date", () => {
    const selected = new Date(2026, 2, 10);
    render(<DatePicker selectedDate={selected} onSelect={vi.fn()} />);

    const selectedBtn = screen.getByText("10").closest("button");
    expect(selectedBtn?.className).toContain("bg-primary");
  });

  it("respects maxDays limit", () => {
    render(<DatePicker selectedDate={null} onSelect={vi.fn()} maxDays={5} />);

    const withinRange = screen.getByText("8");
    expect(withinRange.closest("button")).not.toBeDisabled();

    const beyondRange = screen.getByText("15");
    expect(beyondRange.closest("button")).toBeDisabled();
  });
});
