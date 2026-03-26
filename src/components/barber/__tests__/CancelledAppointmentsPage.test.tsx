import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CancelledAppointmentsPage } from "../CancelledAppointmentsPage";
import type { ReactNode } from "react";

function stubFetch(response: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
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

describe("CancelledAppointmentsPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders page title", async () => {
    stubFetch({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<CancelledAppointmentsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Cancelados")).toBeInTheDocument();
    });
  });

  it("shows empty state when no appointments", async () => {
    stubFetch({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<CancelledAppointmentsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum agendamento cancelado"),
      ).toBeInTheDocument();
    });
  });

  it("renders cancelled appointment cards", async () => {
    stubFetch({
      data: [
        {
          id: "apt-1",
          date: "2026-03-10",
          startTime: "09:00",
          clientName: "João",
          serviceName: "Corte",
          servicePrice: 50,
          cancelledBy: "CLIENT",
          cancelReason: null,
          barberName: "Carlos",
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    render(<CancelledAppointmentsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
      expect(screen.getByText("Corte")).toBeInTheDocument();
    });
  });

  it("shows total count in header", async () => {
    stubFetch({
      data: [],
      meta: { total: 5, page: 1, limit: 20, totalPages: 1 },
    });

    render(<CancelledAppointmentsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("(5)")).toBeInTheDocument();
    });
  });
});
