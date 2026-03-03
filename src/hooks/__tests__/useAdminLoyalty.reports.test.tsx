import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAdminLoyaltyReports } from "../useAdminLoyalty";

const MOCK_REPORTS_RESPONSE = {
  data: {
    totalAccounts: 142,
    tierDistribution: { BRONZE: 98, SILVER: 30, GOLD: 11, DIAMOND: 3 },
    totalPointsInCirculation: 45200,
    totalPointsRedeemed: 12800,
    totalRedemptions: 67,
    redemptionsByStatus: { PENDING: 12, USED: 48, EXPIRED: 7 },
    topRewards: [
      { name: "Barba grátis", count: 23 },
      { name: "Desconto R$10", count: 19 },
    ],
    recentActivity: {
      pointsEarnedLast30Days: 8500,
      redemptionsLast30Days: 15,
      newAccountsLast30Days: 8,
    },
  },
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

describe("useAdminLoyaltyReports", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call GET /api/admin/loyalty/reports", async () => {
    stubFetch(MOCK_REPORTS_RESPONSE);

    renderHook(() => useAdminLoyaltyReports(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/loyalty/reports",
        undefined,
      );
    });
  });

  it("should return typed LoyaltyReportsData", async () => {
    stubFetch(MOCK_REPORTS_RESPONSE);

    const { result } = renderHook(() => useAdminLoyaltyReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(MOCK_REPORTS_RESPONSE.data);
    expect(result.current.data?.totalAccounts).toBe(142);
    expect(result.current.data?.tierDistribution).toHaveProperty("BRONZE");
    expect(result.current.data?.recentActivity).toHaveProperty(
      "pointsEarnedLast30Days",
    );
  });
});
