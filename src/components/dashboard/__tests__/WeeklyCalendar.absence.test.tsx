import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeeklyCalendar } from "../WeeklyCalendar";

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
});
