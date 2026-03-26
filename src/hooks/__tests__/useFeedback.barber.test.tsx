import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useBarberFeedbacks, useBarberFeedbackStats } from "../useFeedback";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useBarberFeedbacks", () => {
  it("calls GET /api/barbers/me/feedbacks with pagination", async () => {
    stubFetch({ data: [], meta: { total: 0 } });

    renderHook(() => useBarberFeedbacks(2, 5), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/barbers/me/feedbacks?page=2&limit=5",
        undefined,
      );
    });
  });

  it("uses default pagination", async () => {
    stubFetch({ data: [], meta: { total: 0 } });

    renderHook(() => useBarberFeedbacks(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/barbers/me/feedbacks?page=1&limit=10",
        undefined,
      );
    });
  });
});

describe("useBarberFeedbackStats", () => {
  it("calls GET /api/barbers/me/feedbacks/stats", async () => {
    stubFetch({ averageRating: 4.5, totalFeedbacks: 20 });

    renderHook(() => useBarberFeedbackStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/barbers/me/feedbacks/stats",
        undefined,
      );
    });
  });

  it("returns stats data", async () => {
    const mockStats = { averageRating: 4.5, totalFeedbacks: 20 };
    stubFetch(mockStats);

    const { result } = renderHook(() => useBarberFeedbackStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
  });
});
