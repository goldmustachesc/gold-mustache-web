import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeSlotGrid } from "../TimeSlotGrid";
import type { BookingAvailability } from "@/types/booking";

const availability: BookingAvailability = {
  barberId: "barber-1",
  serviceDuration: 30,
  windows: [
    { startTime: "09:00", endTime: "10:00" },
    { startTime: "10:30", endTime: "12:00" },
  ],
};

describe("TimeSlotGrid", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <TimeSlotGrid
        availability={null}
        selectedSlot={null}
        onSelect={vi.fn()}
        isLoading
      />,
    );
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(8);
  });

  it("renders empty state when no windows", () => {
    render(
      <TimeSlotGrid
        availability={{
          barberId: "barber-1",
          serviceDuration: 30,
          windows: [],
        }}
        selectedSlot={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nenhuma janela disponível/)).toBeInTheDocument();
  });

  it("renders availability windows", () => {
    render(
      <TimeSlotGrid
        availability={availability}
        selectedSlot={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Janelas disponíveis (2)")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(screen.getByText("10:30 - 12:00")).toBeInTheDocument();
  });

  it("prefills the exact time input with the first available minute", () => {
    render(
      <TimeSlotGrid
        availability={availability}
        selectedSlot={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Escolha o início exato")).toHaveValue(
      "09:00",
    );
  });

  it("calls onSelect when a valid exact time is confirmed", async () => {
    const onSelect = vi.fn();

    render(
      <TimeSlotGrid
        availability={availability}
        selectedSlot={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByLabelText("Escolha o início exato"), {
      target: { value: "09:17" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar horário" }),
    );
    expect(onSelect).toHaveBeenCalledWith({
      time: "09:17",
      available: true,
      barberId: "barber-1",
    });
  });

  it("shows validation when the selected time exceeds the window", () => {
    render(
      <TimeSlotGrid
        availability={availability}
        selectedSlot={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Escolha o início exato"), {
      target: { value: "09:45" },
    });

    expect(
      screen.getByText("Escolha um horário dentro das janelas disponíveis."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar horário" }),
    ).toBeDisabled();
  });
});
