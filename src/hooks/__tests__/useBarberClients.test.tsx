import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useBarberClients,
  useClientAppointments,
  useCreateClient,
  useUpdateClient,
} from "../useBarberClients";

function stubFetch(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    }),
  );
}

function stubFetchData(data: unknown) {
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

const MOCK_CLIENT = { id: "cl-1", fullName: "João Silva", phone: "11999" };

describe("useBarberClients", () => {
  it("calls GET /api/barbers/me/clients with pagination params", async () => {
    stubFetch({
      data: [MOCK_CLIENT],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    renderHook(() => useBarberClients(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/barbers/me/clients"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=20"),
        undefined,
      );
    });
  });

  it("includes search param when provided", async () => {
    stubFetch({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    renderHook(() => useBarberClients("João"), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("search=Jo"),
        undefined,
      );
    });
  });
});

describe("useClientAppointments", () => {
  it("does not fetch when clientId is null", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useClientAppointments(null), {
      wrapper: createWrapper(),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches appointments by client id", async () => {
    stubFetchData([{ id: "apt-1" }]);

    const { result } = renderHook(() => useClientAppointments("cl-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/barbers/me/clients/cl-1/appointments",
      undefined,
    );
  });
});

describe("useCreateClient", () => {
  it("calls POST /api/barbers/me/clients and invalidates queries", async () => {
    stubFetchData(MOCK_CLIENT);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateClient(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ fullName: "João", phone: "11999" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/barbers/me/clients",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["barber-clients"],
    });
  });
});

describe("useUpdateClient", () => {
  it("calls PATCH /api/barbers/me/clients/:id and invalidates queries", async () => {
    stubFetchData(MOCK_CLIENT);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: "cl-1",
        fullName: "João Updated",
        phone: "11999",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/barbers/me/clients/cl-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["barber-clients"],
    });
  });
});
