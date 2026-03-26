import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientHistoryDialog } from "../ClientHistoryDialog";

const historyMock = vi.hoisted(() => ({
  data: [] as Array<{
    id: string;
    serviceName: string;
    servicePrice: number;
    date: string;
    startTime: string;
    barberName: string;
    status:
      | "CONFIRMED"
      | "COMPLETED"
      | "CANCELLED_BY_CLIENT"
      | "CANCELLED_BY_BARBER"
      | "NO_SHOW";
  }>,
  isLoading: false,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({
    children,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode; className?: string }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/hooks/useBarberClients", () => ({
  useClientAppointments: () => historyMock,
}));

const client = {
  id: "client-1",
  fullName: "João Silva",
  phone: "11999998888",
  type: "guest" as const,
  appointmentCount: 3,
  lastAppointment: "2026-03-10",
};

describe("ClientHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    historyMock.data = [];
    historyMock.isLoading = false;
  });

  it("mostra loading enquanto carrega historico", () => {
    historyMock.isLoading = true;

    render(<ClientHistoryDialog client={client} open onOpenChange={vi.fn()} />);

    expect(
      screen.queryByText("Nenhum agendamento encontrado"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Histórico de Agendamentos")).toBeInTheDocument();
  });

  it("mostra estado vazio quando cliente nao possui historico", () => {
    render(<ClientHistoryDialog client={client} open onOpenChange={vi.fn()} />);

    expect(
      screen.getByText("Nenhum agendamento encontrado"),
    ).toBeInTheDocument();
  });

  it("renderiza resumo financeiro e status dos agendamentos", () => {
    historyMock.data = [
      {
        id: "apt-1",
        serviceName: "Corte",
        servicePrice: 50,
        date: "2026-03-10",
        startTime: "09:00",
        barberName: "Carlos",
        status: "COMPLETED",
      },
      {
        id: "apt-2",
        serviceName: "Barba",
        servicePrice: 40,
        date: "2026-03-11",
        startTime: "10:00",
        barberName: "Carlos",
        status: "CONFIRMED",
      },
      {
        id: "apt-3",
        serviceName: "Hidratação",
        servicePrice: 70,
        date: "2026-03-12",
        startTime: "11:00",
        barberName: "Pedro",
        status: "NO_SHOW",
      },
    ];

    render(<ClientHistoryDialog client={client} open onOpenChange={vi.fn()} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*90,00/)).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.getByText("Não compareceu")).toBeInTheDocument();
    expect(screen.getByText("10/03/2026")).toBeInTheDocument();
    expect(screen.getByText("Pedro")).toBeInTheDocument();
  });
});
