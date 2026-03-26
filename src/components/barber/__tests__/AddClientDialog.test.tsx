import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AddClientDialog } from "../AddClientDialog";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastMocks.success, error: toastMocks.error },
}));

vi.mock("@/utils/masks", () => ({
  maskPhone: (v: string) => v,
}));

let queryClient: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function stubFetchData(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("AddClientDialog", () => {
  it("shows error toast when name is empty", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Wrapper>
        <AddClientDialog open={true} onOpenChange={onOpenChange} />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/telefone/i), "11999998888");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(toastMocks.error).toHaveBeenCalledWith("Nome é obrigatório");
  });

  it("shows error toast when phone has invalid length", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/nome completo/i), "João");
    await user.type(screen.getByLabelText(/telefone/i), "12345");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Telefone deve ter 10 ou 11 dígitos",
    );
  });

  it("calls mutateAsync and shows success toast on valid submission", async () => {
    stubFetchData({ id: "cl-1", fullName: "João", phone: "11999998888" });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddClientDialog open={true} onOpenChange={onOpenChange} />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/nome completo/i), "João Silva");
    await user.type(screen.getByLabelText(/telefone/i), "11999998888");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalledWith(
        "Cliente cadastrado com sucesso!",
      );
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
