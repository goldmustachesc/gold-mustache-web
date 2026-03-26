import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminShopHours,
  useUpdateAdminShopHours,
  useAdminShopClosures,
  useCreateAdminShopClosure,
  useDeleteAdminShopClosure,
} from "../useAdminShopConfig";

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
      json: () => Promise.resolve({ success: true, message: "Done" }),
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

const MOCK_HOURS = [
  { dayOfWeek: 1, isOpen: true, startTime: "09:00", endTime: "18:00" },
];

const MOCK_CLOSURE = {
  id: "c-1",
  date: "2026-12-25",
  startTime: null,
  endTime: null,
  reason: "Natal",
};

describe("useAdminShopHours", () => {
  it("calls GET /api/admin/shop-hours", async () => {
    stubFetch(MOCK_HOURS);

    renderHook(() => useAdminShopHours(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/shop-hours", undefined);
    });
  });

  it("returns hours data", async () => {
    stubFetch(MOCK_HOURS);

    const { result } = renderHook(() => useAdminShopHours(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_HOURS);
  });
});

describe("useUpdateAdminShopHours", () => {
  it("calls PUT /api/admin/shop-hours and invalidates queries", async () => {
    stubFetch(MOCK_HOURS);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAdminShopHours(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ days: MOCK_HOURS });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/shop-hours",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-shop-hours"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["slots"],
      exact: false,
    });
  });
});

describe("useAdminShopClosures", () => {
  it("calls GET /api/admin/shop-closures without params", async () => {
    stubFetch([MOCK_CLOSURE]);

    renderHook(() => useAdminShopClosures(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/shop-closures", undefined);
    });
  });

  it("includes date range params when provided", async () => {
    stubFetch([MOCK_CLOSURE]);

    renderHook(() => useAdminShopClosures("2026-01-01", "2026-12-31"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("startDate=2026-01-01"),
        undefined,
      );
    });
  });
});

describe("useCreateAdminShopClosure", () => {
  it("calls POST /api/admin/shop-closures and invalidates queries", async () => {
    stubFetch(MOCK_CLOSURE);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAdminShopClosure(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ date: "2026-12-25", reason: "Natal" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/shop-closures",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-shop-closures"],
      exact: false,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["slots"],
      exact: false,
    });
  });
});

describe("useDeleteAdminShopClosure", () => {
  it("calls DELETE /api/admin/shop-closures/:id and invalidates queries", async () => {
    stubFetchMessage();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteAdminShopClosure(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("c-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/shop-closures/c-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-shop-closures"],
      exact: false,
    });
  });
});
