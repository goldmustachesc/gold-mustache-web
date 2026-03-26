import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRedemptions } from "../useLoyalty";

const MOCK_REDEMPTIONS_RESPONSE = {
  data: [
    {
      id: "red-1",
      code: "ABC-1234-XYZ",
      pointsSpent: 500,
      usedAt: null,
      expiresAt: "2026-04-15T23:59:59.000Z",
      createdAt: "2026-03-01T10:00:00.000Z",
      status: "PENDING",
      reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
    },
    {
      id: "red-2",
      code: "DEF-5678-UVW",
      pointsSpent: 200,
      usedAt: "2026-02-20T14:30:00.000Z",
      expiresAt: "2026-03-20T23:59:59.000Z",
      createdAt: "2026-02-15T08:00:00.000Z",
      status: "USED",
      reward: { name: "Desconto 20%", type: "DISCOUNT" },
    },
  ],
  meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
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

describe("useRedemptions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call GET /api/loyalty/redemptions with page and limit params", async () => {
    stubFetch(MOCK_REDEMPTIONS_RESPONSE);

    renderHook(() => useRedemptions(1, 10), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/loyalty/redemptions?page=1&limit=10",
        undefined,
      );
    });
  });

  it("should return paginated data with meta", async () => {
    stubFetch(MOCK_REDEMPTIONS_RESPONSE);

    const { result } = renderHook(() => useRedemptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0]).toHaveProperty("code", "ABC-1234-XYZ");
    expect(result.current.data?.data[0]).toHaveProperty("status", "PENDING");
    expect(result.current.data?.meta).toEqual({
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });
});
