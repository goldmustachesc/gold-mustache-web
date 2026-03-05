import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCancelledAppointments } from "../useCancelledAppointments";

const MOCK_RESPONSE = {
  data: [
    {
      id: "apt-1",
      date: "2026-03-10",
      startTime: "09:00",
      clientName: "João",
      serviceName: "Corte",
      servicePrice: 50,
      cancelledBy: "CLIENT",
      cancelReason: "Não posso ir",
      barberName: "Carlos",
    },
  ],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

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

describe("useCancelledAppointments", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches cancelled appointments with default pagination", async () => {
    stubFetch(MOCK_RESPONSE);

    renderHook(() => useCancelledAppointments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/barbers/me/cancelled-appointments?page=1&limit=20",
        ),
        undefined,
      );
    });
  });

  it("passes custom page and limit", async () => {
    stubFetch(MOCK_RESPONSE);

    renderHook(() => useCancelledAppointments(2, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        undefined,
      );
    });
  });

  it("returns data with pagination meta", async () => {
    stubFetch(MOCK_RESPONSE);

    const { result } = renderHook(() => useCancelledAppointments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].clientName).toBe("João");
    expect(result.current.data?.meta?.total).toBe(1);
  });
});
