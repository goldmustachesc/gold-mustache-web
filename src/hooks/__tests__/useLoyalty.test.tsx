import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLoyaltyAccount } from "../useLoyalty";

const MOCK_API_ACCOUNT = {
  id: "acc-1",
  currentPoints: 350,
  lifetimePoints: 1200,
  tier: "SILVER",
  referralCode: "ABC123",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
  profileId: "profile-xyz",
  referredById: "ref-456",
};

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

describe("useLoyaltyAccount", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return currentPoints from the API response", async () => {
    stubFetch(MOCK_API_ACCOUNT);
    const { result } = renderHook(() => useLoyaltyAccount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty("currentPoints", 350);
  });

  it("should include referralCode in the response", async () => {
    stubFetch(MOCK_API_ACCOUNT);
    const { result } = renderHook(() => useLoyaltyAccount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty("referralCode", "ABC123");
  });

  it("should include tier and lifetimePoints mapped correctly", async () => {
    stubFetch(MOCK_API_ACCOUNT);
    const { result } = renderHook(() => useLoyaltyAccount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty("tier", "SILVER");
    expect(result.current.data).toHaveProperty("lifetimePoints", 1200);
  });

  it("should match the LoyaltyAccount response shape exactly", async () => {
    stubFetch(MOCK_API_ACCOUNT);
    const { result } = renderHook(() => useLoyaltyAccount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data;
    expect(data).toBeDefined();
    expect(Object.keys(data as Record<string, unknown>).sort()).toEqual(
      [
        "id",
        "currentPoints",
        "lifetimePoints",
        "tier",
        "referralCode",
        "createdAt",
        "updatedAt",
      ].sort(),
    );
    expect(data).not.toHaveProperty("profileId");
    expect(data).not.toHaveProperty("referredById");
  });
});
