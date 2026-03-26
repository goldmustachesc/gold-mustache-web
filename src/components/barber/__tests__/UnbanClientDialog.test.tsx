import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnbanClientDialog } from "../UnbanClientDialog";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const unbanClientMock = vi.hoisted(() => ({
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
  useUnbanClient: () => unbanClientMock,
}));

const client = {
  id: "client-1",
  fullName: "João Silva",
  phone: "11999998888",
  type: "guest" as const,
  appointmentCount: 2,
  lastAppointment: "2026-03-10",
};

describe("UnbanClientDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unbanClientMock.isPending = false;
    unbanClientMock.mutateAsync.mockResolvedValue(undefined);
  });

  it("desbane cliente e fecha no sucesso", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <UnbanClientDialog client={client} open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(unbanClientMock.mutateAsync).toHaveBeenCalledWith("client-1");
    });

    expect(toastMocks.success).toHaveBeenCalledWith(
      "João Silva foi desbanido com sucesso",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("mostra erro da mutation e nao fecha", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    unbanClientMock.mutateAsync.mockRejectedValue(
      new Error("Falha ao desbanir"),
    );

    render(
      <UnbanClientDialog client={client} open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Falha ao desbanir");
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("nao fecha pelo botao cancelar enquanto a mutation esta pendente", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    unbanClientMock.isPending = true;

    render(
      <UnbanClientDialog client={client} open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
