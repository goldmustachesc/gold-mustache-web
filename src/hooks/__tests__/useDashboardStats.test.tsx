import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDashboardStats } from "../useDashboardStats";

const MOCK_STATS = {
  todayAppointments: 5,
  weekAppointments: 22,
  monthRevenue: 3500,
  pendingAppointments: 2,
};

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

describe("useDashboardStats", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls GET /api/dashboard/stats", async () => {
    stubFetch(MOCK_STATS);

    renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/dashboard/stats", undefined);
    });
  });

  it("returns stats data on success", async () => {
    stubFetch(MOCK_STATS);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_STATS);
  });

  it("returns error state on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({ error: "SERVER_ERROR", message: "Error" }),
      }),
    );

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("can opt out of client stats for barber dashboard fetches", async () => {
    stubFetch(MOCK_STATS);

    renderHook(() => useDashboardStats(true, false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/dashboard/stats?includeClientStats=false",
        undefined,
      );
    });
  });
});
