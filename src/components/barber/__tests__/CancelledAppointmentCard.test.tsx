import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CancelledAppointmentCard } from "../CancelledAppointmentCard";
import type { CancelledAppointmentData } from "@/hooks/useCancelledAppointments";

const appointment: CancelledAppointmentData = {
  id: "apt-1",
  date: "2026-03-10",
  startTime: "09:00",
  clientName: "João Silva",
  serviceName: "Corte",
  servicePrice: 50,
  cancelledBy: "CLIENT",
  cancelReason: "Não posso ir",
  barberName: "Carlos",
};

describe("CancelledAppointmentCard", () => {
  it("renders client name", () => {
    render(<CancelledAppointmentCard appointment={appointment} />);
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("renders service name", () => {
    render(<CancelledAppointmentCard appointment={appointment} />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });

  it("renders time", () => {
    render(<CancelledAppointmentCard appointment={appointment} />);
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("shows 'Cancelado pelo Cliente' badge for CLIENT cancellation", () => {
    render(<CancelledAppointmentCard appointment={appointment} />);
    expect(screen.getByText("Cancelado pelo Cliente")).toBeInTheDocument();
  });

  it("shows 'Cancelado pelo Barbeiro' badge for BARBER cancellation", () => {
    render(
      <CancelledAppointmentCard
        appointment={{ ...appointment, cancelledBy: "BARBER" }}
      />,
    );
    expect(screen.getByText("Cancelado pelo Barbeiro")).toBeInTheDocument();
  });

  it("formats price as BRL currency", () => {
    render(<CancelledAppointmentCard appointment={appointment} />);
    expect(screen.getByText(/R\$\s*50,00/)).toBeInTheDocument();
  });
});
