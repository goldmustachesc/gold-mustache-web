import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, afterEach } from "vitest";
import { ChatProfileUpdateForm } from "../ChatProfileUpdateForm";
import type { ReactNode } from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function stubFetchSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    }),
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ChatProfileUpdateForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows name field when currentName is missing", () => {
    render(
      <ChatProfileUpdateForm onSuccess={vi.fn()} currentPhone="11999999999" />,
      { wrapper: createWrapper() },
    );
    expect(
      screen.getByPlaceholderText("Seu nome completo"),
    ).toBeInTheDocument();
  });

  it("shows phone field when currentPhone is missing", () => {
    render(
      <ChatProfileUpdateForm onSuccess={vi.fn()} currentName="João Silva" />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByPlaceholderText("(11) 99999-9999")).toBeInTheDocument();
  });

  it("auto-proceeds when profile is already complete", async () => {
    const onSuccess = vi.fn();
    render(
      <ChatProfileUpdateForm
        onSuccess={onSuccess}
        currentName="João Silva"
        currentPhone="11999999999"
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it("shows validation error for short name", async () => {
    const user = userEvent.setup();
    render(
      <ChatProfileUpdateForm onSuccess={vi.fn()} currentPhone="11999999999" />,
      { wrapper: createWrapper() },
    );

    await user.type(screen.getByPlaceholderText("Seu nome completo"), "A");
    await user.click(screen.getByText("Salvar e Continuar"));

    expect(screen.getByText("Nome muito curto")).toBeInTheDocument();
  });

  it("submits profile update and calls onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    stubFetchSuccess();

    render(<ChatProfileUpdateForm onSuccess={onSuccess} />, {
      wrapper: createWrapper(),
    });

    await user.type(
      screen.getByPlaceholderText("Seu nome completo"),
      "João Silva",
    );
    await user.type(
      screen.getByPlaceholderText("(11) 99999-9999"),
      "11999999999",
    );
    await user.click(screen.getByText("Salvar e Continuar"));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
