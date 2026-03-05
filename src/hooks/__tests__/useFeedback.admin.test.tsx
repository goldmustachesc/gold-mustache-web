import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminFeedbacks,
  useAdminFeedbackStats,
  useBarberRanking,
  useAdminBarberFeedbacks,
} from "../useFeedback";

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

describe("useAdminFeedbacks", () => {
  it("calls GET /api/admin/feedbacks with default pagination", async () => {
    stubFetch({ data: [], meta: { total: 0 } });

    renderHook(() => useAdminFeedbacks(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/feedbacks?"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
        undefined,
      );
    });
  });

  it("includes filter params when provided", async () => {
    stubFetch({ data: [], meta: { total: 0 } });

    renderHook(
      () =>
        useAdminFeedbacks(
          { barberId: "b-1", rating: 5, hasComment: true },
          1,
          20,
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("barberId=b-1"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("rating=5"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("hasComment=true"),
        undefined,
      );
    });
  });

  it("includes date range filters", async () => {
    stubFetch({ data: [], meta: { total: 0 } });

    renderHook(
      () =>
        useAdminFeedbacks({
          startDate: "2026-01-01",
          endDate: "2026-03-01",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("startDate=2026-01-01"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("endDate=2026-03-01"),
        undefined,
      );
    });
  });
});

describe("useAdminFeedbackStats", () => {
  it("calls GET /api/admin/feedbacks/stats", async () => {
    stubFetch({ averageRating: 4.2, totalFeedbacks: 100 });

    renderHook(() => useAdminFeedbackStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/feedbacks/stats",
        undefined,
      );
    });
  });
});

describe("useBarberRanking", () => {
  it("calls GET /api/admin/barbers/ranking", async () => {
    stubFetch([{ barberId: "b-1", name: "Carlos", averageRating: 4.8 }]);

    renderHook(() => useBarberRanking(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/barbers/ranking",
        undefined,
      );
    });
  });

  it("returns ranking data", async () => {
    const mockRanking = [
      { barberId: "b-1", name: "Carlos", averageRating: 4.8 },
    ];
    stubFetch(mockRanking);

    const { result } = renderHook(() => useBarberRanking(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRanking);
  });
});

describe("useAdminBarberFeedbacks", () => {
  it("does not fetch when barberId is undefined", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useAdminBarberFeedbacks(undefined), {
      wrapper: createWrapper(),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls GET /api/admin/barbers/:id/feedbacks", async () => {
    stubFetch({ data: [], meta: { total: 0 } });

    renderHook(() => useAdminBarberFeedbacks("b-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/barbers/b-1/feedbacks"),
        undefined,
      );
    });
  });

  it("includes includeStats param when true", async () => {
    stubFetch({ data: [], meta: { total: 0 } });

    renderHook(() => useAdminBarberFeedbacks("b-1", 1, 20, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("includeStats=true"),
        undefined,
      );
    });
  });
});
