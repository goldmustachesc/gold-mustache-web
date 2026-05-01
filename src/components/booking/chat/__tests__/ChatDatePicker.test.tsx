import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatDatePicker } from "../ChatDatePicker";

const FAKE_TODAY = new Date(2026, 2, 5);

vi.mock("@/hooks/useBrazilToday", () => ({
  useBrazilToday: () => FAKE_TODAY,
}));

describe("ChatDatePicker", () => {
  it("renders current month and year header", () => {
    render(<ChatDatePicker onSelect={vi.fn()} />);
    expect(screen.getByText("Março 2026")).toBeInTheDocument();
  });

  it("renders compact weekday headers", () => {
    render(<ChatDatePicker onSelect={vi.fn()} />);
    const headers = screen.getAllByText("S");
    expect(headers.length).toBeGreaterThanOrEqual(2);
  });

  it("renders day numbers", () => {
    render(<ChatDatePicker onSelect={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
  });

  it("disables past dates", () => {
    render(<ChatDatePicker onSelect={vi.fn()} />);
    const pastDay = screen.getByText("1");
    expect(pastDay.closest("button")).toBeDisabled();
  });

  it("enables today and future dates", () => {
    render(<ChatDatePicker onSelect={vi.fn()} />);
    const todayBtn = screen.getByText("5");
    expect(todayBtn.closest("button")).not.toBeDisabled();
  });

  it("calls onSelect when valid date is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ChatDatePicker onSelect={onSelect} />);

    await user.click(screen.getByText("10"));

    expect(onSelect).toHaveBeenCalledOnce();
    const selected = onSelect.mock.calls[0][0] as Date;
    expect(selected.getDate()).toBe(10);
  });

  it("does not call onSelect for disabled dates", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ChatDatePicker onSelect={onSelect} />);

    await user.click(screen.getByText("1"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("disables explicitly disabled dates", () => {
    render(
      <ChatDatePicker
        onSelect={vi.fn()}
        disabledDates={[new Date(2026, 2, 10)]}
      />,
    );

    const disabledDay = screen.getByText("10");
    expect(disabledDay.closest("button")).toBeDisabled();
  });

  it("navigates to next month", async () => {
    const user = userEvent.setup();

    render(<ChatDatePicker onSelect={vi.fn()} />);
    expect(screen.getByText("Março 2026")).toBeInTheDocument();

    const navButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg") && !b.textContent?.match(/^\d+$/));
    const forwardBtn = navButtons[1];

    await user.click(forwardBtn);
    expect(screen.getByText("Abril 2026")).toBeInTheDocument();
  });

  it("disables previous month button on current month", () => {
    render(<ChatDatePicker onSelect={vi.fn()} />);

    const navButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg") && !b.textContent?.match(/^\d+$/));
    const prevBtn = navButtons[0];

    expect(prevBtn).toBeDisabled();
  });

  it("highlights today with ring styling", () => {
    render(<ChatDatePicker onSelect={vi.fn()} />);

    const todayBtn = screen.getByText("5").closest("button");
    expect(todayBtn?.className).toContain("ring");
  });

  it("respects maxDays limit", () => {
    render(<ChatDatePicker onSelect={vi.fn()} maxDays={5} />);

    const withinRange = screen.getByText("8");
    expect(withinRange.closest("button")).not.toBeDisabled();

    const beyondRange = screen.getByText("15");
    expect(beyondRange.closest("button")).toBeDisabled();
  });

  it("offers quick date shortcuts", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ChatDatePicker onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Hoje" }));

    expect(onSelect).toHaveBeenCalledOnce();
    const selected = onSelect.mock.calls[0][0] as Date;
    expect(selected.getDate()).toBe(5);
  });
});
