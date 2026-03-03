import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseRedemptions = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useLoyalty", () => ({
  useRedemptions: (...args: unknown[]) => mockUseRedemptions(...args),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import RedemptionsPage from "../page";

const MOCK_REDEMPTIONS = [
  {
    id: "red-1",
    code: "ABC-1234-XYZ",
    pointsSpent: 500,
    usedAt: null,
    expiresAt: "2026-04-15T23:59:59.000Z",
    createdAt: "2026-03-01T10:00:00.000Z",
    status: "PENDING" as const,
    reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
  },
  {
    id: "red-2",
    code: "DEF-5678-UVW",
    pointsSpent: 200,
    usedAt: "2026-02-20T14:30:00.000Z",
    expiresAt: "2026-03-20T23:59:59.000Z",
    createdAt: "2026-02-15T08:00:00.000Z",
    status: "USED" as const,
    reward: { name: "Desconto 20%", type: "DISCOUNT" },
  },
];

const MOCK_PAGINATION = { total: 2, page: 1, limit: 10, totalPages: 1 };

function setupMocks(overrides?: {
  redemptions?: typeof MOCK_REDEMPTIONS;
  pagination?: typeof MOCK_PAGINATION;
  isLoading?: boolean;
}) {
  mockUseRedemptions.mockReturnValue({
    data: overrides?.isLoading
      ? undefined
      : {
          data: overrides?.redemptions ?? MOCK_REDEMPTIONS,
          meta: overrides?.pagination ?? MOCK_PAGINATION,
        },
    isLoading: overrides?.isLoading ?? false,
  });
}

describe("RedemptionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("should render a list of redemptions with reward names", () => {
    render(<RedemptionsPage />);

    expect(screen.getByText("Corte Grátis")).toBeInTheDocument();
    expect(screen.getByText("Desconto 20%")).toBeInTheDocument();
  });

  it("should render redemption codes", () => {
    render(<RedemptionsPage />);

    expect(screen.getByText("ABC-1234-XYZ")).toBeInTheDocument();
    expect(screen.getByText("DEF-5678-UVW")).toBeInTheDocument();
  });

  it("should display status badges for each redemption", () => {
    render(<RedemptionsPage />);

    expect(screen.getByText("status.pending")).toBeInTheDocument();
    expect(screen.getByText("status.used")).toBeInTheDocument();
  });

  it("should show empty state when no redemptions exist", () => {
    setupMocks({ redemptions: [] });
    render(<RedemptionsPage />);

    expect(screen.getByText("emptyState")).toBeInTheDocument();
  });

  it("should show loading spinner while data is loading", () => {
    setupMocks({ isLoading: true });
    render(<RedemptionsPage />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("should show pagination controls when there are multiple pages", () => {
    setupMocks({
      pagination: { total: 25, page: 1, limit: 10, totalPages: 3 },
    });
    render(<RedemptionsPage />);

    expect(
      screen.getByRole("button", { name: /pagination\.next/i }),
    ).toBeInTheDocument();
  });

  it("should disable previous button on first page", () => {
    setupMocks({
      pagination: { total: 25, page: 1, limit: 10, totalPages: 3 },
    });
    render(<RedemptionsPage />);

    expect(
      screen.getByRole("button", { name: /pagination\.previous/i }),
    ).toBeDisabled();
  });
});
