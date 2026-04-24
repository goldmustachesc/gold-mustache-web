import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BanClientDialog } from "../BanClientDialog";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const banClientMock = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
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
  useBanClient: () => banClientMock,
}));

const client = {
  id: "client-1",
  fullName: "João Silva",
  phone: "11999998888",
  type: "guest" as const,
  appointmentCount: 2,
  lastAppointment: "2026-03-10",
  isBanned: false,
};

describe("BanClientDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    banClientMock.isPending = false;
    banClientMock.mutateAsync.mockResolvedValue(undefined);
  });

  it("envia motivo opcional e fecha no sucesso", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <BanClientDialog client={client} open onOpenChange={onOpenChange} />,
    );

    await user.type(
      screen.getByLabelText("Motivo (opcional)"),
      "Faltas recorrentes",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar Ban" }));

    await waitFor(() => {
      expect(banClientMock.mutateAsync).toHaveBeenCalledWith({
        clientId: "client-1",
        reason: "Faltas recorrentes",
      });
    });

    expect(toastMocks.success).toHaveBeenCalledWith(
      "João Silva foi banido com sucesso",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("envia undefined quando motivo fica vazio", async () => {
    const user = userEvent.setup();

    render(<BanClientDialog client={client} open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Confirmar Ban" }));

    await waitFor(() => {
      expect(banClientMock.mutateAsync).toHaveBeenCalledWith({
        clientId: "client-1",
        reason: undefined,
      });
    });
  });

  it("mostra erro da mutation sem fechar", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    banClientMock.mutateAsync.mockRejectedValue(new Error("Falha ao banir"));

    render(
      <BanClientDialog client={client} open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Confirmar Ban" }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Falha ao banir");
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
