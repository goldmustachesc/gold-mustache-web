import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GuestAppointmentsLookup } from "../GuestAppointmentsLookup";
import type { ReactNode } from "react";

const mockHasGuestToken = vi.fn();
const mockGetGuestToken = vi.fn();

vi.mock("@/lib/guest-session", () => ({
  hasGuestToken: () => mockHasGuestToken(),
  getGuestToken: () => mockGetGuestToken(),
  setGuestToken: vi.fn(),
  clearGuestToken: vi.fn(),
}));

vi.mock("@/utils/time-slots", () => ({
  getMinutesUntilAppointment: vi.fn().mockReturnValue(180),
}));

vi.mock("@/lib/booking/cancellation", () => ({
  getAppointmentCancellationStatus: vi.fn().mockReturnValue({
    canCancel: true,
    isBlocked: false,
  }),
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
  formatLocalizedDateFromIsoDateLike: vi.fn().mockReturnValue("10 de março"),
  getRelativeDateLabel: vi.fn().mockReturnValue(null),
}));

vi.mock("@/utils/format", () => ({
  formatPrice: vi.fn().mockReturnValue("R$ 50,00"),
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
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("GuestAppointmentsLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows no-token message when guest has no token", async () => {
    mockHasGuestToken.mockReturnValue(false);

    render(<GuestAppointmentsLookup locale="pt-BR" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum agendamento neste dispositivo/),
      ).toBeInTheDocument();
    });
  });

  it("shows new booking link when no token", async () => {
    mockHasGuestToken.mockReturnValue(false);

    render(<GuestAppointmentsLookup locale="pt-BR" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Fazer novo agendamento")).toBeInTheDocument();
    });
  });

  it("shows empty state when token exists but no appointments", async () => {
    mockHasGuestToken.mockReturnValue(true);
    mockGetGuestToken.mockReturnValue("token-123");
    stubFetch([]);

    render(<GuestAppointmentsLookup locale="pt-BR" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum agendamento encontrado/),
      ).toBeInTheDocument();
    });
  });

  it("renders confirmed appointments when available", async () => {
    mockHasGuestToken.mockReturnValue(true);
    mockGetGuestToken.mockReturnValue("token-123");
    stubFetch([
      {
        id: "apt-1",
        date: "2026-03-10",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        cancelReason: null,
        service: {
          id: "s-1",
          name: "Corte",
          duration: 30,
          price: 50,
          slug: "corte",
          description: null,
          active: true,
        },
        barber: { id: "b-1", name: "Carlos", avatarUrl: null },
        client: null,
        guestClient: null,
      },
    ]);

    render(<GuestAppointmentsLookup locale="pt-BR" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText("Agendamentos Confirmados (1)"),
      ).toBeInTheDocument();
    });
  });
});
