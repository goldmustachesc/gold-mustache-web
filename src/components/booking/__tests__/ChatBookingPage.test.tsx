import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, afterEach } from "vitest";
import { ChatBookingPage } from "../ChatBookingPage";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ data: null }),
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => ({ data: null, isLoading: false }),
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

vi.mock("@/lib/guest-session", () => ({
  getGuestToken: vi.fn().mockReturnValue(null),
  setGuestToken: vi.fn(),
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

describe("ChatBookingPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders greeting messages on mount", async () => {
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<ChatBookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Olá/)).toBeInTheDocument();
    });
  });

  it("shows barber selection after greeting delays", async () => {
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<ChatBookingPage />, { wrapper: createWrapper() });

    await waitFor(
      () => {
        expect(screen.getByText("Carlos")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("renders restart button", async () => {
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<ChatBookingPage />, { wrapper: createWrapper() });

    await waitFor(
      () => {
        expect(screen.getByText("Recomeçar")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
