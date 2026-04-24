import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppointmentDetailSheet } from "../AppointmentDetailSheet";
import type { AppointmentWithDetails } from "@/types/booking";
import type { ReactNode } from "react";

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsDesktop: () => false,
}));

vi.mock("@/utils/time-slots", () => ({
  getMinutesUntilAppointment: vi.fn().mockReturnValue(120),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  SheetTitle: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <h2 className={className}>{children}</h2>,
  SheetDescription: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <p className={className}>{children}</p>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
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
    client: {
      id: "c-1",
      fullName: "João Silva",
      phone: "11999999999",
    } as AppointmentWithDetails["client"],
    guestClient: null,
    ...overrides,
  } as AppointmentWithDetails;
}

describe("AppointmentDetailSheet", () => {
  it("returns null when appointment is null", () => {
    const { container } = render(
      <AppointmentDetailSheet
        appointment={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders appointment details when open", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });

  it("shows cancel button for confirmed future appointments", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment()}
        open={true}
        onOpenChange={vi.fn()}
        onCancelAppointment={vi.fn()}
      />,
    );
    expect(screen.getByText("Cancelar agendamento")).toBeInTheDocument();
  });

  it("abre o fluxo de cancelamento e chama onCancelAppointment com o motivo", async () => {
    const user = userEvent.setup();
    const onCancelAppointment = vi.fn().mockResolvedValue(true);

    render(
      <AppointmentDetailSheet
        appointment={buildAppointment()}
        open={true}
        onOpenChange={vi.fn()}
        onCancelAppointment={onCancelAppointment}
      />,
    );

    await user.click(screen.getByText("Cancelar agendamento"));

    expect(screen.getByText("Cancelar atendimento")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      { target: { value: "Motivo informado pelo barbeiro" } },
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    expect(onCancelAppointment).toHaveBeenCalledWith(
      "apt-1",
      "Motivo informado pelo barbeiro",
    );
  });

  it("mantém o sheet de cancelamento aberto com o texto se a mutação falhar", async () => {
    const user = userEvent.setup();
    const onCancelAppointment = vi.fn().mockResolvedValue(false);

    render(
      <AppointmentDetailSheet
        appointment={buildAppointment()}
        open={true}
        onOpenChange={vi.fn()}
        onCancelAppointment={onCancelAppointment}
      />,
    );

    await user.click(screen.getByText("Cancelar agendamento"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      { target: { value: "Tentar de novo depois" } },
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    expect(screen.getByText("Cancelar atendimento")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
    ).toHaveValue("Tentar de novo depois");
  });

  it("shows cancel reason for cancelled appointments", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment({
          status: "CANCELLED_BY_BARBER",
          cancelReason: "Emergência",
        })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Emergência/)).toBeInTheDocument();
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("shows no-show badge for no-show appointments", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment({ status: "NO_SHOW" })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Não compareceu")).toBeInTheDocument();
    expect(screen.getByText("Não compareceu").className).toContain(
      "bg-warning",
    );
    expect(screen.getByText("Não compareceu").className).toContain(
      "text-warning-foreground",
    );
  });

  it("shows Concluído badge for completed appointments", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment({ status: "COMPLETED" })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.getByText("Concluído").className).toContain("bg-success/15");
    expect(screen.getByText("Concluído").className).toContain(
      "text-foreground",
    );
    expect(screen.queryByText(/Lembrete/)).not.toBeInTheDocument();
  });

  it("shows reminder button for confirmed appointments", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment()}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Lembrete/)).toBeInTheDocument();
  });

  it("shows client history button when handler is provided", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment()}
        open={true}
        onOpenChange={vi.fn()}
        onViewClientHistory={vi.fn()}
      />,
    );
    expect(screen.getByTitle("Ver histórico")).toBeInTheDocument();
  });

  it("calls onViewClientHistory with correct params", async () => {
    const user = userEvent.setup();
    const onViewClientHistory = vi.fn();

    render(
      <AppointmentDetailSheet
        appointment={buildAppointment()}
        open={true}
        onOpenChange={vi.fn()}
        onViewClientHistory={onViewClientHistory}
      />,
    );

    await user.click(screen.getByTitle("Ver histórico"));
    expect(onViewClientHistory).toHaveBeenCalledWith("c-1", "registered");
  });

  it("uses guest client info when client is null", () => {
    render(
      <AppointmentDetailSheet
        appointment={buildAppointment({
          client: null,
          guestClient: {
            id: "g-1",
            fullName: "Pedro Guest",
            phone: "11888888888",
          } as AppointmentWithDetails["guestClient"],
        })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Pedro Guest")).toBeInTheDocument();
  });
});
