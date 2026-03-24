import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminFeatureFlags,
  useUpdateAdminFeatureFlags,
} from "../useAdminFeatureFlags";
import type { ResolvedFeatureFlag } from "@/services/feature-flags";

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

const MOCK_FLAGS: ResolvedFeatureFlag[] = [
  {
    key: "loyaltyProgram",
    enabled: false,
    defaultValue: false,
    clientSafe: true,
    description: "Programa de fidelidade",
    category: "product",
    source: "default",
  },
];

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

describe("useAdminFeatureFlags", () => {
  it("calls GET /api/admin/feature-flags", async () => {
    stubFetch({ flags: MOCK_FLAGS });

    renderHook(() => useAdminFeatureFlags(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/feature-flags", undefined);
    });
  });

  it("returns flags data on success", async () => {
    stubFetch({ flags: MOCK_FLAGS });

    const { result } = renderHook(() => useAdminFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ flags: MOCK_FLAGS });
  });
});

describe("useUpdateAdminFeatureFlags", () => {
  it("calls PUT /api/admin/feature-flags with input", async () => {
    stubFetch({ flags: MOCK_FLAGS });

    const { result } = renderHook(() => useUpdateAdminFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        flags: { loyaltyProgram: true },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/feature-flags",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("invalidates feature flags query on success", async () => {
    stubFetch({ flags: MOCK_FLAGS });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAdminFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        flags: { loyaltyProgram: true },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "feature-flags"],
    });
  });
});
