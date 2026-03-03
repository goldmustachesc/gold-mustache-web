import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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
  useAdminLoyaltyAccounts: () => ({
    data: [
      {
        id: "acc-1",
        userId: "u-1",
        fullName: "Test User",
        email: "test@test.com",
        points: 100,
        tier: "BRONZE",
      },
    ],
    isLoading: false,
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

import AdminLoyaltyPage from "../page";

describe("AdminLoyaltyPage — catalog", () => {
  it("should display inactive rewards in the catalog using admin endpoint", async () => {
    const user = userEvent.setup();
    render(<AdminLoyaltyPage />);

    const catalogTab = screen.getByRole("tab", { name: /catalog/i });
    await user.click(catalogTab);

    expect(screen.getByText("Inactive Admin Reward")).toBeInTheDocument();
  });
});
