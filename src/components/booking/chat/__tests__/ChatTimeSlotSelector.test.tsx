import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatTimeSlotSelector } from "../ChatTimeSlotSelector";
import type { BookingAvailability } from "@/types/booking";

const availability: BookingAvailability = {
  barberId: "barber-1",
  serviceDuration: 30,
  windows: [
    { startTime: "09:00", endTime: "10:00" },
    { startTime: "10:30", endTime: "12:00" },
  ],
};

describe("ChatTimeSlotSelector", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <ChatTimeSlotSelector availability={null} onSelect={vi.fn()} isLoading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when no available windows", () => {
    render(
      <ChatTimeSlotSelector
        availability={{
          barberId: "barber-1",
          serviceDuration: 30,
          windows: [],
        }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nenhuma janela disponível/)).toBeInTheDocument();
  });

  it("renders windows and exact-time input", () => {
    render(
      <ChatTimeSlotSelector availability={availability} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(screen.getByText("10:30 - 12:00")).toBeInTheDocument();
    expect(screen.getByLabelText("Escolha o início exato")).toHaveValue(
      "09:00",
    );
  });

  it("rounds and confirms a broken exact time", async () => {
    const onSelect = vi.fn();
    render(
      <ChatTimeSlotSelector availability={availability} onSelect={onSelect} />,
    );

    fireEvent.change(screen.getByLabelText("Escolha o início exato"), {
      target: { value: "09:17" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar horário" }),
    );
    expect(onSelect).toHaveBeenCalledWith({
      time: "09:20",
      available: true,
      barberId: "barber-1",
    });
  });

  it("shows validation error when the exact time does not fit", () => {
    render(
      <ChatTimeSlotSelector availability={availability} onSelect={vi.fn()} />,
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

  it("shows choose another date button when empty and onChooseAnotherDate provided", () => {
    render(
      <ChatTimeSlotSelector
        availability={{
          barberId: "barber-1",
          serviceDuration: 30,
          windows: [],
        }}
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
        availability={{
          barberId: "barber-1",
          serviceDuration: 30,
          windows: [],
        }}
        onSelect={vi.fn()}
        onChooseAnotherDate={onChoose}
      />,
    );

    await user.click(screen.getByText(/Escolher outra data/));
    expect(onChoose).toHaveBeenCalledOnce();
  });
});
