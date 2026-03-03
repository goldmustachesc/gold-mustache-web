import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminRedemptions,
  useAdminValidateRedemption,
  useAdminUseRedemption,
} from "../useAdminLoyalty";

const MOCK_REDEMPTIONS_RESPONSE = {
  data: [
    {
      id: "red-1",
      code: "ABC123",
      pointsSpent: 500,
      clientName: "John Doe",
      clientEmail: "john@example.com",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    },
  ],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

const MOCK_VALIDATE_RESPONSE = {
  data: {
    id: "red-1",
    code: "ABC123",
    pointsSpent: 500,
    clientName: "John Doe",
    clientEmail: "john@example.com",
    rewardName: "Corte Grátis",
    rewardType: "FREE_SERVICE",
    rewardValue: null,
    status: "PENDING",
    createdAt: "2026-02-20T10:00:00.000Z",
    expiresAt: "2026-04-01T00:00:00.000Z",
    usedAt: null,
  },
};

const MOCK_USE_RESPONSE = {
  data: { id: "red-1", usedAt: "2026-03-01T12:00:00.000Z" },
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

describe("useAdminRedemptions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call GET /api/admin/loyalty/redemptions with default params", async () => {
    stubFetch(MOCK_REDEMPTIONS_RESPONSE);

    renderHook(() => useAdminRedemptions(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/loyalty/redemptions?page=1&limit=20",
        undefined,
      );
    });
  });

  it("should include status filter in URL when provided", async () => {
    stubFetch(MOCK_REDEMPTIONS_RESPONSE);

    renderHook(() => useAdminRedemptions("PENDING", 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/loyalty/redemptions?page=1&limit=20&status=PENDING",
        undefined,
      );
    });
  });

  it("should return paginated data with meta", async () => {
    stubFetch(MOCK_REDEMPTIONS_RESPONSE);

    const { result } = renderHook(() => useAdminRedemptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0]).toHaveProperty("code", "ABC123");
    expect(result.current.data?.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });
});

describe("useAdminValidateRedemption", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call GET /api/admin/loyalty/redemptions?code=XXX", async () => {
    stubFetch(MOCK_VALIDATE_RESPONSE);

    const { result } = renderHook(() => useAdminValidateRedemption(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("ABC123");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/redemptions?code=ABC123",
      undefined,
    );
  });

  it("should return redemption data on success", async () => {
    stubFetch(MOCK_VALIDATE_RESPONSE);

    const { result } = renderHook(() => useAdminValidateRedemption(), {
      wrapper: createWrapper(),
    });

    let data: unknown;
    await act(async () => {
      data = await result.current.mutateAsync("ABC123");
    });

    expect(data).toMatchObject({
      code: "ABC123",
      clientName: "John Doe",
      status: "PENDING",
    });
  });
});

describe("useAdminUseRedemption", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call POST /api/admin/loyalty/redemptions/use with code", async () => {
    stubFetch(MOCK_USE_RESPONSE);

    const { result } = renderHook(() => useAdminUseRedemption(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("ABC123");
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/loyalty/redemptions/use",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "ABC123" }),
        }),
      );
    });
  });

  it("should invalidate admin redemptions query on success", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    stubFetch(MOCK_USE_RESPONSE);

    const { result } = renderHook(() => useAdminUseRedemption(), { wrapper });

    await act(async () => {
      result.current.mutate("ABC123");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["admin", "loyalty", "redemptions"],
        }),
      );
    });
  });
});
