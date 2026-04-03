import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-BR",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("next/image", () => ({
  default: function MockImage({ src, alt }: { src?: string; alt?: string }) {
    // biome-ignore lint/performance/noImgElement: test mock for next/image
    return <img src={src ?? ""} alt={alt ?? ""} />;
  },
}));

vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminExpiringPoints: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useAdminLoyaltyAccounts: () => ({
    data: {
      accounts: [
        {
          id: "acc-1",
          userId: "u-1",
          fullName: "Test User",
          email: "test@test.com",
          points: 100,
          tier: "BRONZE",
          lifetimePoints: 200,
          memberSince: "2024-01-01T00:00:00.000Z",
          redemptionCount: 0,
        },
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
  }),
  useAdminAdjustPoints: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAdminToggleReward: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/useLoyalty", () => ({
  useRewards: () => ({
    data: [
      {
        id: "r-1",
        name: "Public Active Reward",
        costInPoints: 100,
        active: true,
        description: "Visible reward",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAdminRewards", () => ({
  useAdminRewards: () => ({
    data: [
      {
        id: "r-1",
        name: "Public Active Reward",
        costInPoints: 100,
        active: true,
        description: "Visible reward",
      },
      {
        id: "r-2",
        name: "Inactive Admin Reward",
        costInPoints: 200,
        active: false,
        description: "Hidden from public",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/components/loyalty/RewardModal", () => ({
  RewardModal: () => null,
}));

vi.mock("@/components/admin/RedemptionsTab", () => ({
  RedemptionsTab: () => <div data-testid="redemptions-tab-mock" />,
}));

import { PrivateHeaderProvider } from "@/components/private/PrivateHeaderContext";
import AdminLoyaltyPage from "../page";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PrivateHeaderProvider>{children}</PrivateHeaderProvider>;
}

describe("AdminLoyaltyPage — catalog", () => {
  it("should display inactive rewards in the catalog using admin endpoint", async () => {
    const user = userEvent.setup();
    render(<AdminLoyaltyPage />, { wrapper: Wrapper });

    const catalogTab = screen.getByRole("tab", { name: /catalog/i });
    await user.click(catalogTab);

    expect(screen.getByText("Inactive Admin Reward")).toBeInTheDocument();
  });

  it("should show 'Inativo' badge on inactive rewards", async () => {
    const user = userEvent.setup();
    render(<AdminLoyaltyPage />, { wrapper: Wrapper });

    const catalogTab = screen.getByRole("tab", { name: /catalog/i });
    await user.click(catalogTab);

    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("should have unchecked switch for inactive rewards and checked for active", async () => {
    const user = userEvent.setup();
    render(<AdminLoyaltyPage />, { wrapper: Wrapper });

    const catalogTab = screen.getByRole("tab", { name: /catalog/i });
    await user.click(catalogTab);

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
    expect(switches[0]).toBeChecked();
    expect(switches[1]).not.toBeChecked();
  });
});
