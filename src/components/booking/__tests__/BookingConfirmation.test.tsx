import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingConfirmation } from "../BookingConfirmation";
import type { AppointmentWithDetails } from "@/types/booking";

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
}));

const appointment = {
  id: "apt-1",
  date: "2026-03-10",
  startTime: "09:00",
  endTime: "09:30",
  status: "CONFIRMED",
  service: {
    id: "s-1",
    name: "Corte",
    duration: 30,
    price: 50,
    slug: "corte",
    description: null,
    active: true,
  },
  barber: { id: "b-1", name: "Carlos", avatarUrl: null },
} as AppointmentWithDetails;

describe("BookingConfirmation", () => {
  it("renders confirmation title", () => {
    render(<BookingConfirmation appointment={appointment} onClose={vi.fn()} />);
    expect(screen.getByText("Agendamento confirmado")).toBeInTheDocument();
  });

  it("renders appointment details", () => {
    render(<BookingConfirmation appointment={appointment} onClose={vi.fn()} />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("10/03/2026")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 09:30")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
  });

  it("calls onClose when 'Fazer Novo Agendamento' is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BookingConfirmation appointment={appointment} onClose={onClose} />);

    await user.click(screen.getByText("Fazer Novo Agendamento"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows 'Ver Meus Agendamentos' button when onViewAppointments provided", () => {
    render(
      <BookingConfirmation
        appointment={appointment}
        onClose={vi.fn()}
        onViewAppointments={vi.fn()}
      />,
    );
    expect(screen.getByText("Ver Meus Agendamentos")).toBeInTheDocument();
  });

  it("calls onViewAppointments when button is clicked", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(
      <BookingConfirmation
        appointment={appointment}
        onClose={vi.fn()}
        onViewAppointments={onView}
      />,
    );

    await user.click(screen.getByText("Ver Meus Agendamentos"));
    expect(onView).toHaveBeenCalledOnce();
  });
});
