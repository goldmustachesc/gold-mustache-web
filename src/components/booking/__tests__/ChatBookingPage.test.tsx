import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  formatIsoDateYyyyMmDdInSaoPaulo: vi.fn().mockReturnValue("2026-03-10"),
  parseIsoDateYyyyMmDdAsSaoPauloDate: vi.fn(
    (iso: string) => new Date(`${iso}T00:00:00`),
  ),
}));

vi.mock("@/utils/time-slots", () => ({
  formatDateToString: vi.fn().mockReturnValue("2026-03-10"),
  getBrazilDateString: vi.fn().mockReturnValue("2026-03-10"),
  parseDateString: vi.fn((dateStr: string) => new Date(`${dateStr}T00:00:00`)),
  addMinutesToTime: vi
    .fn()
    .mockImplementation((time: string, duration: number) => {
      const [hours, minutes] = time.split(":").map(Number);
      const endMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
    }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/guest-session", () => ({
  getGuestToken: vi.fn().mockReturnValue(null),
  setGuestToken: vi.fn(),
  clearGuestToken: vi.fn(),
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

function stubFetchByUrl(barbers: unknown, services: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      const data = urlStr.includes("services") ? services : barbers;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data }),
      });
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

  it("shows empty barbers message when barbers list is empty", async () => {
    stubFetch([]);

    render(<ChatBookingPage />, { wrapper: createWrapper() });

    await waitFor(
      () => {
        expect(
          screen.getByText("Nenhum barbeiro disponível no momento."),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows services after barber is selected", async () => {
    const barbers = [{ id: "b-1", name: "Carlos", avatarUrl: null }];
    const services = [
      {
        id: "s-1",
        name: "Corte",
        price: 50,
        duration: 30,
        description: null,
      },
    ];
    stubFetchByUrl(barbers, services);

    render(<ChatBookingPage />, { wrapper: createWrapper() });

    await waitFor(
      () => {
        expect(screen.getByText("Carlos")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    await userEvent.click(screen.getByText("Carlos"));

    await waitFor(
      () => {
        expect(screen.getByText("Corte")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
