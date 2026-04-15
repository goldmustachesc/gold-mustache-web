import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditClientDialog } from "../EditClientDialog";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const updateClientMock = vi.hoisted(() => ({
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
  useUpdateClient: () => updateClientMock,
}));

vi.mock("@/utils/masks", () => ({
  maskPhone: (value: string) => value,
}));

const guestClient = {
  id: "client-1",
  fullName: "João Silva",
  phone: "11999998888",
  type: "guest" as const,
  appointmentCount: 3,
  lastAppointment: "2026-03-10",
  isBanned: false,
};

const registeredClient = {
  ...guestClient,
  type: "registered" as const,
};

describe("EditClientDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateClientMock.isPending = false;
    updateClientMock.mutateAsync.mockResolvedValue(undefined);
  });

  it("mostra aviso para cliente cadastrado e nao renderiza formulario", () => {
    render(
      <EditClientDialog
        client={registeredClient}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Clientes cadastrados gerenciam seus próprios dados."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome completo")).not.toBeInTheDocument();
  });

  it("valida nome e telefone antes de enviar", async () => {
    const user = userEvent.setup();

    render(
      <EditClientDialog client={guestClient} open onOpenChange={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText("Nome completo"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(toastMocks.error).toHaveBeenCalledWith("Nome é obrigatório");

    await user.type(screen.getByLabelText("Nome completo"), "João");
    await user.clear(screen.getByLabelText("Telefone"));
    await user.type(screen.getByLabelText("Telefone"), "12345");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Telefone deve ter 10 ou 11 dígitos",
    );
    expect(updateClientMock.mutateAsync).not.toHaveBeenCalled();
  });

  it("envia atualizacao e fecha no sucesso", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <EditClientDialog
        client={guestClient}
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.clear(screen.getByLabelText("Nome completo"));
    await user.type(screen.getByLabelText("Nome completo"), "Maria Souza");
    await user.clear(screen.getByLabelText("Telefone"));
    await user.type(screen.getByLabelText("Telefone"), "11911112222");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(updateClientMock.mutateAsync).toHaveBeenCalledWith({
        id: "client-1",
        fullName: "Maria Souza",
        phone: "11911112222",
      });
    });

    expect(toastMocks.success).toHaveBeenCalledWith(
      "Cliente atualizado com sucesso!",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
