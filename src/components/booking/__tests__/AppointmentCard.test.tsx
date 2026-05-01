import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppointmentCard } from "../AppointmentCard";
import type { AppointmentWithDetails } from "@/types/booking";

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
  formatLocalizedDateFromIsoDateLike: vi.fn().mockReturnValue("10 de março"),
  getRelativeDateLabel: vi.fn().mockReturnValue(null),
}));

vi.mock("@/utils/format", () => ({
  formatPrice: vi.fn().mockReturnValue("R$ 50,00"),
}));

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    date: "2026-03-10",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    cancelReason: null,
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
    client: null,
    guestClient: null,
    ...overrides,
  } as AppointmentWithDetails;
}

describe("AppointmentCard", () => {
  it("renders service name, date, and time", () => {
    render(<AppointmentCard appointment={buildAppointment()} />);

    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("10 de março")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 09:30")).toBeInTheDocument();
  });

  it("shows barber name by default", () => {
    render(<AppointmentCard appointment={buildAppointment()} />);
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("shows client info when showClientInfo is true", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment({
          client: {
            id: "c-1",
            fullName: "João Silva",
            phone: null,
          } as AppointmentWithDetails["client"],
        })}
        showClientInfo
      />,
    );
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    render(<AppointmentCard appointment={buildAppointment()} />);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("shows cancelled status badge", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment({ status: "CANCELLED_BY_CLIENT" })}
      />,
    );
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("shows cancel button when canCancel and onCancel provided", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment()}
        onCancel={vi.fn()}
        canCancel
      />,
    );
    expect(screen.getByText("Cancelar Agendamento")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <AppointmentCard
        appointment={buildAppointment()}
        onCancel={onCancel}
        canCancel
      />,
    );

    await user.click(screen.getByText("Cancelar Agendamento"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows cancelling state", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment()}
        onCancel={vi.fn()}
        canCancel
        isCancelling
      />,
    );
    expect(screen.getByText("Cancelando...")).toBeInTheDocument();
  });

  it("shows cancel reason when present", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment({
          status: "CANCELLED_BY_BARBER",
          cancelReason: "Emergência pessoal",
        })}
      />,
    );
    expect(screen.getByText(/Emergência pessoal/)).toBeInTheDocument();
  });

  it("shows cancellation blocked warning", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment()}
        isCancellationBlocked
      />,
    );
    expect(screen.getByText(/Cancelamento não permitido/)).toBeInTheDocument();
  });

  it("shows no-show button when canMarkNoShow", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment()}
        onMarkNoShow={vi.fn()}
        canMarkNoShow
      />,
    );
    expect(screen.getByText("Não Compareceu")).toBeInTheDocument();
  });

  it("calls onMarkNoShow when clicked", async () => {
    const user = userEvent.setup();
    const onMarkNoShow = vi.fn();

    render(
      <AppointmentCard
        appointment={buildAppointment()}
        onMarkNoShow={onMarkNoShow}
        canMarkNoShow
      />,
    );

    await user.click(screen.getByText("Não Compareceu"));
    expect(onMarkNoShow).toHaveBeenCalledOnce();
  });

  it("shows feedback button when onFeedback provided and no existing feedback", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment({ status: "COMPLETED" })}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.getByText("Avaliar Atendimento")).toBeInTheDocument();
  });

  it("shows feedback badge when hasFeedback is true", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment({ status: "COMPLETED" })}
        hasFeedback
      />,
    );
    expect(screen.getByText("Avaliação enviada")).toBeInTheDocument();
  });

  it("hides feedback button when hasFeedback is true", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment({ status: "COMPLETED" })}
        onFeedback={vi.fn()}
        hasFeedback
      />,
    );
    expect(screen.queryByText("Avaliar Atendimento")).not.toBeInTheDocument();
  });

  it("shows client phone when showClientPhone is true", () => {
    render(
      <AppointmentCard
        appointment={buildAppointment({
          client: {
            id: "c-1",
            fullName: "João",
            phone: "11999999999",
          } as AppointmentWithDetails["client"],
        })}
        showClientPhone
      />,
    );
    expect(screen.getByText("11999999999")).toBeInTheDocument();
  });

  it("shows price formatted in BRL", () => {
    render(<AppointmentCard appointment={buildAppointment()} />);
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
  });
});
