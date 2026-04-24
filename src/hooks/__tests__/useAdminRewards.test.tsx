import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminRewards,
  useAdminReward,
  useAdminCreateReward,
  useAdminUpdateReward,
  useAdminDeleteReward,
} from "../useAdminRewards";

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

function stubFetchMessage() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, message: "Deleted" }),
    }),
  );
}

let queryClient: QueryClient;

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const MOCK_REWARD = {
  id: "r-1",
  name: "Corte Grátis",
  description: "Um corte de cortesia",
  pointsCost: 500,
  type: "FREE_SERVICE",
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("useAdminRewards", () => {
  it("calls GET /api/admin/loyalty/rewards", async () => {
    stubFetch([MOCK_REWARD]);

    renderHook(() => useAdminRewards(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/loyalty/rewards",
        undefined,
      );
    });
  });

  it("returns reward list", async () => {
    stubFetch([MOCK_REWARD]);

    const { result } = renderHook(() => useAdminRewards(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_REWARD]);
  });
});

describe("useAdminReward", () => {
  it("calls GET /api/admin/loyalty/rewards/:id", async () => {
    stubFetch(MOCK_REWARD);

    renderHook(() => useAdminReward("r-1"), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/loyalty/rewards/r-1",
        undefined,
      );
    });
  });

  it("does not fetch when id is empty", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useAdminReward(""), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("useAdminCreateReward", () => {
  it("calls POST /api/admin/loyalty/rewards and invalidates queries", async () => {
    stubFetch(MOCK_REWARD);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAdminCreateReward(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        name: "Corte Grátis",
        description: "Cortesia",
        pointsCost: 500,
        type: "FREE_SERVICE",
        active: true,
      } as Parameters<typeof result.current.mutate>[0]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/rewards",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["loyalty", "rewards"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "loyalty", "rewards"],
    });
  });
});

describe("useAdminUpdateReward", () => {
  it("calls PUT /api/admin/loyalty/rewards/:id and invalidates queries", async () => {
    stubFetch(MOCK_REWARD);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAdminUpdateReward(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: "r-1",
        data: {
          name: "Updated",
          description: "",
          pointsCost: 100,
          type: "FREE_SERVICE",
          value: undefined,
          imageUrl: "",
          stock: undefined,
          active: true,
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/rewards/r-1",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "loyalty", "rewards"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "loyalty", "rewards", "r-1"],
    });
  });
});

describe("useAdminDeleteReward", () => {
  it("calls DELETE /api/admin/loyalty/rewards/:id and invalidates queries", async () => {
    stubFetchMessage();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAdminDeleteReward(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("r-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/rewards/r-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["loyalty", "rewards"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "loyalty", "rewards"],
    });
  });
});
