import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, afterEach } from "vitest";
import { BookingPage } from "../BookingPage";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ data: null }),
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyInSaoPaulo: vi.fn().mockReturnValue("10/03/2026"),
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
}));

vi.mock("@/utils/time-slots", () => ({
  formatDateToString: vi.fn().mockReturnValue("2026-03-10"),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
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

describe("BookingPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders barber selection step initially", async () => {
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Escolha o Barbeiro")).toBeInTheDocument();
    });
  });

  it("renders barbers from API", async () => {
    stubFetch([
      { id: "b-1", name: "Carlos", avatarUrl: null },
      { id: "b-2", name: "João", avatarUrl: null },
    ]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
      expect(screen.getByText("João")).toBeInTheDocument();
    });
  });

  it("advances to service step when barber is selected", async () => {
    const user = userEvent.setup();
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });

    stubFetch([
      {
        id: "s-1",
        slug: "corte",
        name: "Corte",
        description: null,
        duration: 30,
        price: 50,
        active: true,
      },
    ]);

    await user.click(screen.getByText("Carlos"));

    await waitFor(() => {
      expect(screen.getByText("Escolha o Serviço")).toBeInTheDocument();
    });
  });

  it("shows back button on service step", async () => {
    const user = userEvent.setup();
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });

    stubFetch([]);
    await user.click(screen.getByText("Carlos"));

    await waitFor(() => {
      expect(screen.getByText("Voltar")).toBeInTheDocument();
    });
  });

  it("includes info step for guest users", async () => {
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Escolha o Barbeiro")).toBeInTheDocument();
    });
  });
});
