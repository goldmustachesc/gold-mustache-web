import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingReview } from "../BookingReview";
import type { BarberData, ServiceData, TimeSlot } from "@/types/booking";

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyInSaoPaulo: vi.fn().mockReturnValue("10/03/2026"),
}));

const barber: BarberData = { id: "b-1", name: "Carlos", avatarUrl: null };
const service: ServiceData = {
  id: "s-1",
  slug: "corte",
  name: "Corte",
  description: null,
  duration: 30,
  price: 50,
  active: true,
};
const slot: TimeSlot = { time: "09:00", available: true };

describe("BookingReview", () => {
  it("renders all booking details", () => {
    render(
      <BookingReview
        barber={barber}
        service={service}
        date={new Date("2026-03-10")}
        slot={slot}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
    expect(screen.getByText("10/03/2026")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 09:30")).toBeInTheDocument();
  });

  it("calculates end time from slot + duration", () => {
    const longService = { ...service, duration: 60 };
    render(
      <BookingReview
        barber={barber}
        service={longService}
        date={new Date("2026-03-10")}
        slot={slot}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        isLoading={false}
      />,
    );
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
  });

  it("shows guest info when provided", () => {
    render(
      <BookingReview
        barber={barber}
        service={service}
        date={new Date("2026-03-10")}
        slot={slot}
        guestInfo={{ clientName: "João", clientPhone: "11999999999" }}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        isLoading={false}
      />,
    );
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByText("11999999999")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <BookingReview
        barber={barber}
        service={service}
        date={new Date("2026-03-10")}
        slot={slot}
        onConfirm={onConfirm}
        onBack={vi.fn()}
        isLoading={false}
      />,
    );

    await user.click(screen.getByText("Confirmar Agendamento"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onBack when back button clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <BookingReview
        barber={barber}
        service={service}
        date={new Date("2026-03-10")}
        slot={slot}
        onConfirm={vi.fn()}
        onBack={onBack}
        isLoading={false}
      />,
    );

    await user.click(screen.getByText("Voltar e Editar"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("disables buttons when loading", () => {
    render(
      <BookingReview
        barber={barber}
        service={service}
        date={new Date("2026-03-10")}
        slot={slot}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        isLoading
      />,
    );
    expect(screen.getByText("Confirmando...")).toBeInTheDocument();
    expect(
      screen.getByText("Voltar e Editar").closest("button"),
    ).toBeDisabled();
  });
});
