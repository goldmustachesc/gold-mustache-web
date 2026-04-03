import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LoyaltyReportsData } from "@/types/loyalty";
import type { AdminExpiringPointTransaction } from "@/hooks/useAdminLoyalty";

const mockUseAdminLoyaltyReports = vi.hoisted(() => vi.fn());
const mockUseAdminExpiringPoints = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminLoyaltyReports: () => mockUseAdminLoyaltyReports(),
  useAdminExpiringPoints: () => mockUseAdminExpiringPoints(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-BR",
}));

import { QuickStats } from "../QuickStats";

const mockReportsData: LoyaltyReportsData = {
  totalAccounts: 142,
  tierDistribution: { BRONZE: 98, SILVER: 30, GOLD: 11, DIAMOND: 3 },
  totalPointsInCirculation: 45200,
  totalPointsRedeemed: 12800,
  totalRedemptions: 67,
  redemptionsByStatus: { PENDING: 12, USED: 48, EXPIRED: 7 },
  topRewards: [],
  recentActivity: {
    pointsEarnedLast30Days: 8500,
    redemptionsLast30Days: 15,
    newAccountsLast30Days: 8,
  },
};

const mockExpiring: AdminExpiringPointTransaction[] = [
  { id: "t1", points: 50, expiresAt: "2026-05-01" },
  { id: "t2", points: 30, expiresAt: "2026-05-02" },
];

describe("QuickStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminLoyaltyReports.mockReturnValue({
      data: mockReportsData,
      isLoading: false,
      isError: false,
    });
    mockUseAdminExpiringPoints.mockReturnValue({
      data: mockExpiring,
      isLoading: false,
      isError: false,
    });
  });

  it("chama useAdminLoyaltyReports e useAdminExpiringPoints e renderiza 4 KpiCards", () => {
    render(<QuickStats />);

    expect(mockUseAdminLoyaltyReports).toHaveBeenCalled();
    expect(mockUseAdminExpiringPoints).toHaveBeenCalled();

    expect(screen.getByTestId("kpi-quick-total-accounts")).toHaveTextContent(
      "142",
    );
    expect(
      screen.getByTestId("kpi-quick-points-circulation"),
    ).toHaveTextContent("45.200");
    expect(
      screen.getByTestId("kpi-quick-pending-redemptions"),
    ).toHaveTextContent("12");
    expect(screen.getByTestId("kpi-quick-expiring-points")).toHaveTextContent(
      "2",
    );
  });

  it("mostra loading quando relatórios ainda carregam", () => {
    mockUseAdminLoyaltyReports.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    mockUseAdminExpiringPoints.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<QuickStats />);

    expect(screen.getByTestId("quick-stats-loading")).toBeInTheDocument();
    expect(
      screen.queryByTestId("kpi-quick-total-accounts"),
    ).not.toBeInTheDocument();
  });

  it("mostra mensagem de erro em vez do spinner quando isError é true", () => {
    mockUseAdminLoyaltyReports.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    mockUseAdminExpiringPoints.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<QuickStats />);

    expect(screen.getByTestId("quick-stats-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("loadError");
    expect(screen.queryByTestId("quick-stats-loading")).not.toBeInTheDocument();
  });

  it("destaca o card de pontos expirando quando a contagem é maior que zero", () => {
    render(<QuickStats />);

    expect(
      screen.getByTestId("quick-stats-expiring-highlight"),
    ).toBeInTheDocument();
  });

  it("não destaca o card de pontos expirando quando não há itens", () => {
    mockUseAdminExpiringPoints.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<QuickStats />);

    expect(
      screen.queryByTestId("quick-stats-expiring-highlight"),
    ).not.toBeInTheDocument();
  });
});
