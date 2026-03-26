import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminServices,
  useCreateAdminService,
  useUpdateAdminService,
  useToggleAdminServiceStatus,
  useDeleteAdminService,
} from "../useAdminServices";

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
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

const MOCK_SERVICE = {
  id: "s-1",
  slug: "corte",
  name: "Corte",
  description: null,
  duration: 30,
  price: 50,
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("useAdminServices", () => {
  it("calls GET /api/admin/services", async () => {
    stubFetch([MOCK_SERVICE]);

    renderHook(() => useAdminServices(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/services", undefined);
    });
  });

  it("returns service list", async () => {
    stubFetch([MOCK_SERVICE]);

    const { result } = renderHook(() => useAdminServices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_SERVICE]);
  });
});

describe("useCreateAdminService", () => {
  it("calls POST /api/admin/services and invalidates queries", async () => {
    stubFetch(MOCK_SERVICE);
    queryClient.setQueryData(["services"], [MOCK_SERVICE]);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAdminService(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        name: "Corte",
        duration: 30,
        price: 50,
      } as Parameters<typeof result.current.mutate>[0]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/services",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-services"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    });
  });
});

describe("useUpdateAdminService", () => {
  it("calls PUT /api/admin/services/:id and invalidates queries", async () => {
    stubFetch(MOCK_SERVICE);
    queryClient.setQueryData(["services"], [MOCK_SERVICE]);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAdminService(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: "s-1",
        name: "Corte Updated",
      } as Parameters<typeof result.current.mutate>[0]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/services/s-1",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-services"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    });
  });
});

describe("useToggleAdminServiceStatus", () => {
  it("calls PUT /api/admin/services/:id with active flag and invalidates queries", async () => {
    stubFetch({ ...MOCK_SERVICE, active: false });
    queryClient.setQueryData(["services"], [MOCK_SERVICE]);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useToggleAdminServiceStatus(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: "s-1", active: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/services/s-1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ active: false }),
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-services"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    });
  });
});

describe("useDeleteAdminService", () => {
  it("calls DELETE /api/admin/services/:id and invalidates queries", async () => {
    stubFetch(MOCK_SERVICE);
    queryClient.setQueryData(["services"], [MOCK_SERVICE]);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteAdminService(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("s-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/services/s-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-services"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    });
  });
});
