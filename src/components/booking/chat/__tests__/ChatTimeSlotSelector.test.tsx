import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatTimeSlotSelector } from "../ChatTimeSlotSelector";
import type { BookingAvailability } from "@/types/booking";

const availability: BookingAvailability = {
  barberId: "barber-1",
  serviceDuration: 60,
  windows: [
    { startTime: "09:00", endTime: "12:00" },
    { startTime: "14:00", endTime: "15:00" },
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
    expect(screen.getByText("Nenhum horário disponível")).toBeInTheDocument();
  });

  it("renders ready-to-pick times without exposing the manual exact-time input", () => {
    render(
      <ChatTimeSlotSelector availability={availability} onSelect={vi.fn()} />,
    );

    expect(screen.getByText("Escolha um horário")).toBeInTheDocument();
    expect(screen.getByText("Melhores horários")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.queryByText("Janelas livres")).toBeNull();
    expect(screen.queryByLabelText("Escolha o início exato")).toBeNull();
  });

  it("confirms a selected smart time", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ChatTimeSlotSelector availability={availability} onSelect={onSelect} />,
    );

    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.getByText("Atendimento: 09:00 - 10:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar 09:00" }));
    expect(onSelect).toHaveBeenCalledWith({
      time: "09:00",
      available: true,
      barberId: "barber-1",
    });
  });

  it("shows more available times on demand", async () => {
    const user = userEvent.setup();
    render(
      <ChatTimeSlotSelector availability={availability} onSelect={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "10:00" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Ver mais horários/ }));

    expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument();
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
