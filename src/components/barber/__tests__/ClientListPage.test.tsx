import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientListPage } from "../ClientListPage";

const mocks = vi.hoisted(() => ({
  usePrivateHeader: vi.fn(),
  useBarberClients: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: (...args: unknown[]) => mocks.usePrivateHeader(...args),
}));

vi.mock("@/hooks/useBarberClients", () => ({
  useBarberClients: (...args: unknown[]) => mocks.useBarberClients(...args),
}));

vi.mock("../ClientCard", () => ({
  ClientCard: ({
    client,
    onViewHistory,
    onEdit,
    onBan,
    onUnban,
  }: {
    client: { id: string; fullName: string };
    onViewHistory?: (client: { id: string; fullName: string }) => void;
    onEdit?: (client: { id: string; fullName: string }) => void;
    onBan?: (client: { id: string; fullName: string }) => void;
    onUnban?: (client: { id: string; fullName: string }) => void;
  }) => (
    <div>
      <span>{client.fullName}</span>
      <button type="button" onClick={() => onViewHistory?.(client)}>
        historico-{client.id}
      </button>
      <button type="button" onClick={() => onEdit?.(client)}>
        editar-{client.id}
      </button>
      <button type="button" onClick={() => onBan?.(client)}>
        banir-{client.id}
      </button>
      <button type="button" onClick={() => onUnban?.(client)}>
        desbanir-{client.id}
      </button>
    </div>
  ),
}));

vi.mock("../AddClientDialog", () => ({
  AddClientDialog: ({
    open,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => <div>{open ? "add-dialog-open" : "add-dialog-closed"}</div>,
}));

vi.mock("../ClientHistoryDialog", () => ({
  ClientHistoryDialog: ({
    open,
    client,
  }: {
    open: boolean;
    client: { fullName: string } | null;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      {open && client ? `history-open:${client.fullName}` : "history-closed"}
    </div>
  ),
}));

vi.mock("../EditClientDialog", () => ({
  EditClientDialog: ({
    open,
    client,
  }: {
    open: boolean;
    client: { fullName: string } | null;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>{open && client ? `edit-open:${client.fullName}` : "edit-closed"}</div>
  ),
}));

vi.mock("../BanClientDialog", () => ({
  BanClientDialog: ({
    open,
    client,
  }: {
    open: boolean;
    client: { fullName: string } | null;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>{open && client ? `ban-open:${client.fullName}` : "ban-closed"}</div>
  ),
}));

vi.mock("../UnbanClientDialog", () => ({
  UnbanClientDialog: ({
    open,
    client,
  }: {
    open: boolean;
    client: { fullName: string } | null;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      {open && client ? `unban-open:${client.fullName}` : "unban-closed"}
    </div>
  ),
}));

const registeredClient = {
  id: "client-1",
  fullName: "João Silva",
  phone: "11999998888",
  type: "registered" as const,
  appointmentCount: 4,
  lastAppointment: "2026-03-10",
};

const guestClient = {
  id: "client-2",
  fullName: "Maria Guest",
  phone: "11888887777",
  type: "guest" as const,
  appointmentCount: 1,
  lastAppointment: "2026-03-09",
};

describe("ClientListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configura o header privado e mostra estado de erro", () => {
    mocks.useBarberClients.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("load failed"),
    });

    render(<ClientListPage />);

    expect(mocks.usePrivateHeader).toHaveBeenCalledWith({
      title: "Clientes",
      icon: expect.anything(),
      backHref: "/pt-BR/barbeiro",
    });
    expect(screen.getAllByText("Erro ao carregar clientes")).not.toHaveLength(
      0,
    );
  });

  it("mostra estado vazio e abre modal de adicionar cliente", async () => {
    const user = userEvent.setup();

    mocks.useBarberClients.mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, page: 1, totalPages: 1, pageSize: 10 },
      },
      isLoading: false,
      error: null,
    });

    render(<ClientListPage />);

    expect(screen.getAllByText("Nenhum cliente cadastrado")).not.toHaveLength(
      0,
    );
    expect(screen.getByText("add-dialog-closed")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /adicionar cliente/i }),
    );

    expect(screen.getByText("add-dialog-open")).toBeInTheDocument();
  });

  it("renderiza clientes, pagina e abre dialogs de acao", async () => {
    const user = userEvent.setup();

    mocks.useBarberClients.mockReturnValue({
      data: {
        data: [registeredClient, guestClient],
        meta: { total: 2, page: 1, totalPages: 2, pageSize: 10 },
      },
      isLoading: false,
      error: null,
    });

    render(<ClientListPage />);

    expect(screen.getAllByText("2")).not.toHaveLength(0);
    expect(screen.getAllByText("João Silva")).not.toHaveLength(0);
    expect(screen.getAllByText("Maria Guest")).not.toHaveLength(0);
    expect(screen.getAllByText("Página 1 de 2")).not.toHaveLength(0);

    await user.click(screen.getAllByRole("button", { name: "Próxima" })[0]);

    expect(screen.getAllByText("Página 2 de 2")).not.toHaveLength(0);

    await user.click(screen.getAllByText("historico-client-1")[0]);
    expect(screen.getByText("history-open:João Silva")).toBeInTheDocument();

    await user.click(screen.getAllByText("editar-client-1")[0]);
    expect(screen.getByText("edit-open:João Silva")).toBeInTheDocument();

    await user.click(screen.getAllByText("banir-client-2")[0]);
    expect(screen.getByText("ban-open:Maria Guest")).toBeInTheDocument();

    await user.click(screen.getAllByText("desbanir-client-2")[0]);
    expect(screen.getByText("unban-open:Maria Guest")).toBeInTheDocument();
  });

  it("reinicia a pagina ao pesquisar", async () => {
    const user = userEvent.setup();

    mocks.useBarberClients.mockImplementation(
      (search?: string, page?: number) => ({
        data: {
          data: [registeredClient],
          meta: { total: 1, page: page ?? 1, totalPages: 2, pageSize: 10 },
        },
        isLoading: false,
        error: null,
        search,
      }),
    );

    render(<ClientListPage />);

    await user.click(screen.getAllByRole("button", { name: "Próxima" })[0]);
    expect(screen.getAllByText("Página 2 de 2")).not.toHaveLength(0);

    await user.type(
      screen.getAllByPlaceholderText("Pesquisar por nome ou telefone...")[0],
      "jo",
    );

    await waitFor(() => {
      expect(screen.getAllByText('Resultados para "jo"')).not.toHaveLength(0);
    });

    expect(mocks.useBarberClients).toHaveBeenLastCalledWith("jo", 1);
  });
});
