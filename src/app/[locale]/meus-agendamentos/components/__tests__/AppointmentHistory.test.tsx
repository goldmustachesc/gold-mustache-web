import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppointmentHistory } from "../AppointmentHistory";
import type { AppointmentWithDetails } from "@/types/booking";

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
}));

vi.mock("@/utils/time-slots", () => ({
  getMinutesUntilAppointment: vi.fn().mockReturnValue(-60),
}));

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: null,
    guestClientId: null,
    barberId: "b-1",
    serviceId: "s-1",
    date: "2026-03-10",
    startTime: "09:00",
    endTime: "09:30",
    status: "COMPLETED",
    cancelReason: null,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
    service: { id: "s-1", name: "Corte", duration: 30, price: 50 },
    barber: { id: "b-1", name: "Carlos", avatarUrl: null },
    client: null,
    guestClient: null,
    ...overrides,
  } as AppointmentWithDetails;
}

describe("AppointmentHistory", () => {
  const baseProps = {
    appointments: [buildAppointment()],
    feedbacksGiven: new Set<string>(),
    onOpenFeedback: vi.fn(),
  };

  it("renders section heading", () => {
    render(<AppointmentHistory {...baseProps} />);
    expect(screen.getByText("Histórico")).toBeInTheDocument();
  });

  it("renders appointment count", () => {
    render(<AppointmentHistory {...baseProps} />);
    expect(screen.getByText(/1 agendamento anterior/)).toBeInTheDocument();
  });

  it("renders plural when multiple appointments", () => {
    render(
      <AppointmentHistory
        {...baseProps}
        appointments={[
          buildAppointment({ id: "a1" }),
          buildAppointment({ id: "a2" }),
        ]}
      />,
    );
    expect(screen.getByText(/2 agendamentos anteriores/)).toBeInTheDocument();
  });

  it("shows feedback button for completed appointments", () => {
    render(<AppointmentHistory {...baseProps} />);
    expect(screen.getByText("Avaliar Atendimento")).toBeInTheDocument();
  });

  it("shows feedback badge for appointments with feedback", () => {
    render(
      <AppointmentHistory {...baseProps} feedbacksGiven={new Set(["apt-1"])} />,
    );
    expect(screen.getByText("Avaliação enviada")).toBeInTheDocument();
  });

  it("does not show feedback button for cancelled appointments", () => {
    render(
      <AppointmentHistory
        {...baseProps}
        appointments={[buildAppointment({ status: "CANCELLED_BY_CLIENT" })]}
      />,
    );
    expect(screen.queryByText("Avaliar Atendimento")).not.toBeInTheDocument();
  });

  it("shows feedback button for past confirmed appointments", () => {
    render(
      <AppointmentHistory
        {...baseProps}
        appointments={[buildAppointment({ status: "CONFIRMED" })]}
      />,
    );
    expect(screen.getByText("Avaliar Atendimento")).toBeInTheDocument();
  });
});
