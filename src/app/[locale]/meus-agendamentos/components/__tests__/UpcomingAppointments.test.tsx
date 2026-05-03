import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpcomingAppointments } from "../UpcomingAppointments";
import type { AppointmentWithDetails } from "@/types/booking";

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
  formatLocalizedDateFromIsoDateLike: vi.fn().mockReturnValue("10 de março"),
  getRelativeDateLabel: vi.fn().mockReturnValue(null),
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
    status: "CONFIRMED",
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

describe("UpcomingAppointments", () => {
  const baseProps = {
    appointments: [buildAppointment()],
    cancellingId: null,
    onCancel: vi.fn(),
    getCancellationStatus: vi.fn().mockReturnValue({
      canCancel: true,
      isBlocked: false,
    }),
  };

  it("renders section heading", () => {
    render(<UpcomingAppointments {...baseProps} />);
    expect(screen.getByText("Próximos Agendamentos")).toBeInTheDocument();
  });

  it("renders appointment count", () => {
    render(<UpcomingAppointments {...baseProps} />);
    expect(screen.getByText(/1 agendamento confirmado/)).toBeInTheDocument();
  });

  it("renders plural when multiple appointments", () => {
    render(
      <UpcomingAppointments
        {...baseProps}
        appointments={[
          buildAppointment({ id: "a1" }),
          buildAppointment({ id: "a2" }),
        ]}
      />,
    );
    expect(screen.getByText(/2 agendamentos confirmados/)).toBeInTheDocument();
  });

  it("renders appointment cards", () => {
    render(<UpcomingAppointments {...baseProps} />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("renders date group header for multiple appointments", () => {
    render(
      <UpcomingAppointments
        {...baseProps}
        appointments={[
          buildAppointment({ id: "a1" }),
          buildAppointment({ id: "a2" }),
        ]}
      />,
    );
    expect(screen.getAllByText("10 de março").length).toBeGreaterThan(0);
  });

  it("passes cancellation props to cards", () => {
    render(
      <UpcomingAppointments
        {...baseProps}
        getCancellationStatus={vi
          .fn()
          .mockReturnValue({ canCancel: true, isBlocked: false })}
      />,
    );
    expect(screen.getByText("Cancelar Agendamento")).toBeInTheDocument();
  });
});
