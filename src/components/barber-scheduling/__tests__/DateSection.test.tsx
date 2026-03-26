import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateSection } from "../DateSection";
import type { DateOption } from "@/utils/scheduling";

const DATE_OPTIONS: DateOption[] = [
  {
    value: "2025-12-15",
    display: "15/12/2025",
    weekday: "segunda-feira",
    isToday: true,
  },
  {
    value: "2025-12-16",
    display: "16/12/2025",
    weekday: "terça-feira",
    isToday: false,
  },
  {
    value: "2025-12-17",
    display: "17/12/2025",
    weekday: "quarta-feira",
    isToday: false,
  },
];

describe("DateSection", () => {
  it("renders section title", () => {
    render(
      <DateSection
        dates={DATE_OPTIONS}
        selectedDate="2025-12-15"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Data")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(
      <DateSection
        dates={DATE_OPTIONS}
        selectedDate="2025-12-15"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Escolha a data")).toBeInTheDocument();
  });
});
