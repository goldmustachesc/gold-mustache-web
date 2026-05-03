import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateSection } from "../DateSection";

const DEFAULT_PROPS = {
  selectedDate: "",
  disabledDates: [] as Date[],
  dateAvailabilityLoading: false,
  calendarMaxDays: 30,
  onSelect: vi.fn(),
};

describe("DateSection", () => {
  it("renders section title", () => {
    render(<DateSection {...DEFAULT_PROPS} />);
    expect(screen.getByText("Data")).toBeInTheDocument();
  });

  it("shows selected date in subtitle when a date is selected", () => {
    render(<DateSection {...DEFAULT_PROPS} selectedDate="2025-12-15" />);
    expect(screen.getByText("15/12/2025")).toBeInTheDocument();
  });

  it("shows placeholder subtitle when no date selected", () => {
    render(<DateSection {...DEFAULT_PROPS} selectedDate="" />);
    expect(screen.getByText("Escolha a data")).toBeInTheDocument();
  });

  it("shows loading text when availability is loading", () => {
    render(<DateSection {...DEFAULT_PROPS} dateAvailabilityLoading={true} />);
    expect(
      screen.getByText("Carregando disponibilidade..."),
    ).toBeInTheDocument();
  });

  it("renders the calendar grid", () => {
    render(<DateSection {...DEFAULT_PROPS} />);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
  });
});
