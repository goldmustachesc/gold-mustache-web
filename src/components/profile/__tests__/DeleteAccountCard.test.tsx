import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeleteAccountCard } from "../DeleteAccountCard";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      title: "Excluir Conta",
      description: "Exclua permanentemente sua conta e todos os dados",
      button: "Excluir Minha Conta",
      confirmWord: "EXCLUIR",
      success: "Sua conta foi excluída com sucesso.",
      error: "Erro ao excluir conta. Tente novamente.",
      "warning.title": "Esta ação é irreversível!",
      "warning.item1": "Todos os seus dados pessoais serão excluídos",
      "warning.item2": "Seu histórico de agendamentos será removido",
      "warning.item3": "Você não poderá recuperar sua conta",
      "dialog.title": "Tem certeza?",
      "dialog.description":
        "Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta.",
      "dialog.confirmLabel": `Digite "${params?.word || "EXCLUIR"}" para confirmar:`,
      "dialog.cancel": "Cancelar",
      "dialog.confirm": "Excluir Conta",
      "dialog.deleting": "Excluindo...",
    };
    return translations[key] || key;
  },
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useParams: () => ({
    locale: "pt-BR",
  }),
}));

// Mock authService
vi.mock("@/services/auth", () => ({
  authService: {
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DeleteAccountCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the delete account card with warning", () => {
    render(<DeleteAccountCard />);

    expect(screen.getByText("Excluir Conta")).toBeInTheDocument();
    expect(
      screen.getByText("Exclua permanentemente sua conta e todos os dados"),
    ).toBeInTheDocument();
    expect(screen.getByText("Esta ação é irreversível!")).toBeInTheDocument();
    expect(
      screen.getByText("Todos os seus dados pessoais serão excluídos"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /excluir minha conta/i }),
    ).toBeInTheDocument();
  });

  it("should open confirmation dialog when clicking delete button", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });
    await user.click(deleteButton);

    expect(screen.getByText("Tem certeza?")).toBeInTheDocument();
    expect(
      screen.getByText(/Esta ação não pode ser desfeita/),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("EXCLUIR")).toBeInTheDocument();
  });

  it("should disable confirm button until correct word is typed", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "Excluir Conta" });
    const input = screen.getByPlaceholderText("EXCLUIR");

    // Button should be disabled initially
    expect(confirmButton).toBeDisabled();

    // Type wrong word
    await user.type(input, "wrong");
    expect(confirmButton).toBeDisabled();

    // Clear and type correct word
    await user.clear(input);
    await user.type(input, "EXCLUIR");
    expect(confirmButton).not.toBeDisabled();
  });

  it("should handle case-insensitive confirmation word", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "Excluir Conta" });
    const input = screen.getByPlaceholderText("EXCLUIR");

    // Type lowercase
    await user.type(input, "excluir");
    expect(confirmButton).not.toBeDisabled();
  });

  it("should close dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });
    await user.click(deleteButton);

    expect(screen.getByText("Tem certeza?")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Cancelar" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Tem certeza?")).not.toBeInTheDocument();
    });
  });

  it("should call API and redirect on successful delete", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    const { authService } = await import("@/services/auth");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });
    await user.click(deleteButton);

    const input = screen.getByPlaceholderText("EXCLUIR");
    await user.type(input, "EXCLUIR");

    const confirmButton = screen.getByRole("button", { name: "Excluir Conta" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/profile/delete", {
        method: "DELETE",
      });
    });

    await waitFor(() => {
      expect(authService.signOut).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Sua conta foi excluída com sucesso.",
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/pt-BR");
    });
  });

  it("should show error toast on API failure", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Error deleting account" }),
    });

    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });
    await user.click(deleteButton);

    const input = screen.getByPlaceholderText("EXCLUIR");
    await user.type(input, "EXCLUIR");

    const confirmButton = screen.getByRole("button", { name: "Excluir Conta" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao excluir conta. Tente novamente.",
      );
    });
  });

  it("should disable confirm button while request is in progress", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });
    await user.click(deleteButton);

    const input = screen.getByPlaceholderText("EXCLUIR");
    await user.type(input, "EXCLUIR");

    const confirmButton = screen.getByRole("button", { name: "Excluir Conta" });

    // Button should be enabled before click
    expect(confirmButton).not.toBeDisabled();

    // Click confirm
    await user.click(confirmButton);

    // API should have been called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/profile/delete", {
        method: "DELETE",
      });
    });
  });

  it("should keep confirmation state when dialog changes", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountCard />);

    const deleteButton = screen.getByRole("button", {
      name: /excluir minha conta/i,
    });

    // Open dialog and type confirmation
    await user.click(deleteButton);
    const input = screen.getByPlaceholderText("EXCLUIR");
    await user.type(input, "EXCLUIR");

    // Verify button is enabled after typing correct word
    const confirmButton = screen.getByRole("button", { name: "Excluir Conta" });
    expect(confirmButton).not.toBeDisabled();

    // Close dialog
    const cancelButton = screen.getByRole("button", { name: "Cancelar" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Tem certeza?")).not.toBeInTheDocument();
    });
  });
});
