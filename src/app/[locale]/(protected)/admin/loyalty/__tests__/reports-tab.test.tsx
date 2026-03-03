import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { LoyaltyReportsData } from "@/types/loyalty";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-BR",
}));

const mockReportsData: LoyaltyReportsData = {
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
};

const emptyReportsData: LoyaltyReportsData = {
  totalAccounts: 0,
  tierDistribution: {},
  totalPointsInCirculation: 0,
  totalPointsRedeemed: 0,
  totalRedemptions: 0,
  redemptionsByStatus: { PENDING: 0, USED: 0, EXPIRED: 0 },
  topRewards: [],
  recentActivity: {
    pointsEarnedLast30Days: 0,
    redemptionsLast30Days: 0,
    newAccountsLast30Days: 0,
  },
};

let mockData: LoyaltyReportsData | undefined = mockReportsData;
let mockIsLoading = false;

vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminLoyaltyReports: () => ({
    data: mockData,
    isLoading: mockIsLoading,
  }),
}));

import { ReportsTab } from "@/components/admin/ReportsTab";

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ReportsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = mockReportsData;
    mockIsLoading = false;
  });

  it("should render 4 KPI cards", () => {
    renderWithProviders(<ReportsTab />);

    expect(screen.getByTestId("kpi-total-accounts")).toHaveTextContent("142");
    expect(screen.getByTestId("kpi-points-in-circulation")).toHaveTextContent(
      "45.200",
    );
    expect(screen.getByTestId("kpi-redemptions-month")).toHaveTextContent("15");
    expect(screen.getByTestId("kpi-redemption-rate")).toBeInTheDocument();
  });

  it("should render tier distribution with visual bars", () => {
    renderWithProviders(<ReportsTab />);

    expect(screen.getByText("BRONZE")).toBeInTheDocument();
    expect(screen.getByText("SILVER")).toBeInTheDocument();
    expect(screen.getByText("GOLD")).toBeInTheDocument();
    expect(screen.getByText("DIAMOND")).toBeInTheDocument();

    expect(screen.getByTestId("tier-bar-BRONZE")).toBeInTheDocument();
    expect(screen.getByTestId("tier-bar-SILVER")).toBeInTheDocument();
    expect(screen.getByTestId("tier-bar-GOLD")).toBeInTheDocument();
    expect(screen.getByTestId("tier-bar-DIAMOND")).toBeInTheDocument();
  });

  it("should render top rewards list", () => {
    renderWithProviders(<ReportsTab />);

    expect(screen.getByText("Barba grátis")).toBeInTheDocument();
    expect(screen.getByText("Desconto R$10")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("19")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    mockIsLoading = true;
    mockData = undefined;

    renderWithProviders(<ReportsTab />);

    expect(screen.getByTestId("reports-loading")).toBeInTheDocument();
  });

  it("should show empty state when data has all zeroes", () => {
    mockData = emptyReportsData;

    renderWithProviders(<ReportsTab />);

    expect(screen.getByTestId("kpi-total-accounts")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-points-in-circulation")).toHaveTextContent(
      "0",
    );
    expect(screen.getByTestId("reports-no-rewards")).toBeInTheDocument();
  });

  it("should render recent activity section with 30-day data", () => {
    renderWithProviders(<ReportsTab />);

    expect(screen.getByTestId("activity-points-earned")).toHaveTextContent(
      "8.500",
    );
    expect(screen.getByTestId("activity-redemptions")).toHaveTextContent("15");
    expect(screen.getByTestId("activity-new-accounts")).toHaveTextContent("8");
  });
});
