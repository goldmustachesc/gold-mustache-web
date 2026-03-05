import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminBarbers,
  useCreateBarber,
  useUpdateBarber,
  useDeleteBarber,
} from "../useAdminBarbers";

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

const MOCK_BARBER = {
  id: "b-1",
  userId: "u-1",
  name: "Carlos",
  avatarUrl: null,
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  _count: { appointments: 10 },
};

describe("useAdminBarbers", () => {
  it("calls GET /api/admin/barbers", async () => {
    stubFetch([MOCK_BARBER]);

    renderHook(() => useAdminBarbers(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/barbers", undefined);
    });
  });

  it("returns barber list", async () => {
    stubFetch([MOCK_BARBER]);

    const { result } = renderHook(() => useAdminBarbers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_BARBER]);
  });
});

describe("useCreateBarber", () => {
  it("calls POST /api/admin/barbers with input", async () => {
    stubFetch(MOCK_BARBER);

    const { result } = renderHook(() => useCreateBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "Carlos", email: "carlos@test.com" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/barbers",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("invalidates admin barbers and barbers queries on success", async () => {
    stubFetch(MOCK_BARBER);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "Carlos", email: "carlos@test.com" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "barbers"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["barbers"] });
  });
});

describe("useUpdateBarber", () => {
  it("calls PUT /api/admin/barbers/:id", async () => {
    stubFetch(MOCK_BARBER);

    const { result } = renderHook(() => useUpdateBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: "b-1", name: "Carlos Updated" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/barbers/b-1",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("invalidates queries on success", async () => {
    stubFetch(MOCK_BARBER);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: "b-1", name: "Updated" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "barbers"],
    });
  });
});

describe("useDeleteBarber", () => {
  it("calls DELETE /api/admin/barbers/:id", async () => {
    stubFetch({ success: true, softDelete: true, message: "Deleted" });

    const { result } = renderHook(() => useDeleteBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("b-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/barbers/b-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("invalidates queries on success", async () => {
    stubFetch({ success: true, softDelete: true, message: "Deleted" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("b-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "barbers"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["barbers"] });
  });
});
