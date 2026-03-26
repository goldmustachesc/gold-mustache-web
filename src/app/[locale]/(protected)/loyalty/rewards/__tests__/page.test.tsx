import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRefetch = vi.hoisted(() => vi.fn());
const mockMutateAsync = vi.hoisted(() => vi.fn());
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

const MOCK_REWARD = {
  id: "rw-1",
  name: "Corte Grátis",
  description: "Um corte de cabelo grátis",
  costInPoints: 500,
  active: true,
  type: "FREE_SERVICE" as const,
};

const MOCK_REDEMPTION_RESULT = {
  id: "red-1",
  code: "ABC-1234-XYZ",
  pointsSpent: 500,
  expiresAt: "2026-04-15T23:59:59.000Z",
  reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
};

function setupDefaultMocks() {
  mockUseLoyaltyAccount.mockReturnValue({
    data: {
      id: "acc-1",
      currentPoints: 1000,
      lifetimePoints: 2000,
      tier: "SILVER",
      referralCode: "XYZ789",
    },
    isLoading: false,
  });

  mockUseRewards.mockReturnValue({
    data: [MOCK_REWARD],
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  });

  mockMutateAsync.mockResolvedValue(MOCK_REDEMPTION_RESULT);
  mockUseRedeemReward.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  });
}

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

describe("LoyaltyRewardsPage — success modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();

    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      const msg = String(args[0] ?? "");
      if (msg.includes("concurrent rendering")) return;
      throw new Error(`[Unexpected console.error] ${msg}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should show reward name in the success modal after redemption", async () => {
    const user = userEvent.setup();
    render(<LoyaltyRewardsPage />);

    const redeemButton = screen.getByRole("button", { name: /^redeem$/i });
    await user.click(redeemButton);

    const confirmButton = screen.getByRole("button", {
      name: /confirmRedeem/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByTestId("success-reward-name")).toHaveTextContent(
        "Corte Grátis",
      );
    });
  });

  it("should show expiry date in the success modal", async () => {
    const user = userEvent.setup();
    render(<LoyaltyRewardsPage />);

    const redeemButton = screen.getByRole("button", { name: /^redeem$/i });
    await user.click(redeemButton);

    const confirmButton = screen.getByRole("button", {
      name: /confirmRedeem/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByTestId("success-expiry-date")).toBeInTheDocument();
    });
    expect(screen.getByTestId("success-expiry-date").textContent).toMatch(
      /15\/04\/2026/,
    );
  });

  it("should have a copy button in the success modal that copies the code", async () => {
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<LoyaltyRewardsPage />);

    const redeemButton = screen.getByRole("button", { name: /^redeem$/i });
    await user.click(redeemButton);

    const confirmButton = screen.getByRole("button", {
      name: /confirmRedeem/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("ABC-1234-XYZ")).toBeInTheDocument();
    });

    const copyButton = screen.getByRole("button", { name: /copyCode/i });
    await user.click(copyButton);

    expect(writeTextSpy).toHaveBeenCalledWith("ABC-1234-XYZ");
  });

  it("should show the 'presentCode' instruction in the success modal", async () => {
    const user = userEvent.setup();
    render(<LoyaltyRewardsPage />);

    const redeemButton = screen.getByRole("button", { name: /^redeem$/i });
    await user.click(redeemButton);

    const confirmButton = screen.getByRole("button", {
      name: /confirmRedeem/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("redeemCodeInstruction")).toBeInTheDocument();
    });
  });
});
