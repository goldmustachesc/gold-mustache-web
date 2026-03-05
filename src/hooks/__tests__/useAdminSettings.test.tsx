import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAdminSettings, useUpdateAdminSettings } from "../useAdminSettings";

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

const MOCK_SETTINGS = {
  id: "settings-1",
  name: "Gold Mustache",
  shortName: "GM",
  tagline: "Barbearia Premium",
  phone: "11999999999",
  bookingEnabled: true,
};

describe("useAdminSettings", () => {
  it("calls GET /api/admin/settings", async () => {
    stubFetch(MOCK_SETTINGS);

    renderHook(() => useAdminSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/settings", undefined);
    });
  });

  it("returns settings data on success", async () => {
    stubFetch(MOCK_SETTINGS);

    const { result } = renderHook(() => useAdminSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_SETTINGS);
  });
});

describe("useUpdateAdminSettings", () => {
  it("calls PUT /api/admin/settings with input", async () => {
    stubFetch(MOCK_SETTINGS);

    const { result } = renderHook(() => useUpdateAdminSettings(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "Gold Mustache Updated" } as Parameters<
        typeof result.current.mutate
      >[0]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/settings",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("invalidates settings query on success", async () => {
    stubFetch(MOCK_SETTINGS);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAdminSettings(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "Updated" } as Parameters<
        typeof result.current.mutate
      >[0]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "settings"],
    });
  });
});
