import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRefetch = vi.hoisted(() => vi.fn());
const mockUseLoyaltyAccount = vi.hoisted(() => vi.fn());
const mockUseRewards = vi.hoisted(() => vi.fn());
const mockUseRedeemReward = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useLoyalty", () => ({
  useLoyaltyAccount: (...args: unknown[]) => mockUseLoyaltyAccount(...args),
  useRewards: (...args: unknown[]) => mockUseRewards(...args),
  useRedeemReward: (...args: unknown[]) => mockUseRedeemReward(...args),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import LoyaltyRewardsPage from "../page";

describe("LoyaltyRewardsPage — error handling", () => {
  beforeEach(() => {
    mockUseLoyaltyAccount.mockReturnValue({
      data: {
        id: "acc-1",
        currentPoints: 350,
        lifetimePoints: 500,
        tier: "BRONZE",
        referralCode: "XYZ789",
      },
      isLoading: false,
    });

    mockUseRedeemReward.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("should show error state instead of empty list when API fails", () => {
    mockUseRewards.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    render(<LoyaltyRewardsPage />);

    expect(screen.queryByText("emptyState")).not.toBeInTheDocument();
  });

  it("should display a retry button when API fails", () => {
    mockUseRewards.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    render(<LoyaltyRewardsPage />);

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
