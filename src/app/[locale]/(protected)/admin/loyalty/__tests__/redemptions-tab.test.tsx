import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import type { ReactNode } from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockValidateMutateAsync = vi.fn();
const mockUseMutateAsync = vi.fn();
const mockRedemptions = [
  {
    id: "red-1",
    code: "ABC123",
    pointsSpent: 500,
    clientName: "John Doe",
    clientEmail: "john@example.com",
    rewardName: "Corte Grátis",
    rewardType: "FREE_SERVICE",
    status: "PENDING" as const,
    createdAt: "2026-02-20T10:00:00.000Z",
    expiresAt: "2026-04-01T00:00:00.000Z",
    usedAt: null,
  },
  {
    id: "red-2",
    code: "DEF456",
    pointsSpent: 200,
    clientName: "Jane Smith",
    clientEmail: "jane@example.com",
    rewardName: "Desconto 20%",
    rewardType: "DISCOUNT",
    status: "USED" as const,
    createdAt: "2026-02-15T08:00:00.000Z",
    expiresAt: "2026-03-15T23:59:59.000Z",
    usedAt: "2026-02-28T14:00:00.000Z",
  },
  {
    id: "red-3",
    code: "GHJ789",
    pointsSpent: 300,
    clientName: "Bob Brown",
    clientEmail: "bob@example.com",
    rewardName: "Produto Grátis",
    rewardType: "PRODUCT",
    status: "EXPIRED" as const,
    createdAt: "2026-01-01T08:00:00.000Z",
    expiresAt: "2026-02-01T23:59:59.000Z",
    usedAt: null,
  },
];

vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminRedemptions: () => ({
    data: {
      data: mockRedemptions,
      meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
    },
    isLoading: false,
  }),
  useAdminValidateRedemption: () => ({
    mutateAsync: mockValidateMutateAsync,
    isPending: false,
  }),
  useAdminUseRedemption: () => ({
    mutateAsync: mockUseMutateAsync,
    isPending: false,
  }),
}));

import { RedemptionsTab } from "@/components/admin/RedemptionsTab";

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("RedemptionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render code input with validate button", () => {
    renderWithProviders(<RedemptionsTab />);

    expect(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    ).toBeInTheDocument();
  });

  it("should call validate mutation when form is submitted with a code", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-1",
      code: "ABC123",
      clientName: "John Doe",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    });

    renderWithProviders(<RedemptionsTab />);

    const input = screen.getByPlaceholderText(/redemptions\.codePlaceholder/i);
    await user.type(input, "ABC123");

    const validateButton = screen.getByRole("button", {
      name: /redemptions\.validate/i,
    });
    await user.click(validateButton);

    expect(mockValidateMutateAsync).toHaveBeenCalledWith("ABC123");
  });

  it("should show 'Marcar como Usado' button when validated redemption status is PENDING", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-1",
      code: "ABC123",
      clientName: "John Doe",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    });

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "ABC123",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
      ).toBeInTheDocument();
    });
  });

  it("should NOT show 'Marcar como Usado' button when status is USED", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-2",
      code: "DEF456",
      clientName: "Jane Smith",
      rewardName: "Desconto 20%",
      rewardType: "DISCOUNT",
      status: "USED",
      createdAt: "2026-02-15T08:00:00.000Z",
      expiresAt: "2026-03-15T23:59:59.000Z",
      usedAt: "2026-02-28T14:00:00.000Z",
    });

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "DEF456",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("validated-redemption-card"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /redemptions\.markAsUsed/i }),
    ).not.toBeInTheDocument();
  });

  it("should NOT show 'Marcar como Usado' button when status is EXPIRED", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-3",
      code: "GHJ789",
      clientName: "Bob Brown",
      rewardName: "Produto Grátis",
      rewardType: "PRODUCT",
      status: "EXPIRED",
      createdAt: "2026-01-01T08:00:00.000Z",
      expiresAt: "2026-02-01T23:59:59.000Z",
      usedAt: null,
    });

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "GHJ789",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("validated-redemption-card"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /redemptions\.markAsUsed/i }),
    ).not.toBeInTheDocument();
  });

  it("should display recent redemptions (desktop table and mobile cards)", () => {
    renderWithProviders(<RedemptionsTab />);

    expect(screen.getByTestId("redemption-card-red-1")).toHaveTextContent(
      "John Doe",
    );
    expect(screen.getByTestId("redemption-card-red-2")).toHaveTextContent(
      "Jane Smith",
    );
    expect(screen.getByTestId("redemption-card-red-3")).toHaveTextContent(
      "Bob Brown",
    );
    expect(screen.getByTestId("redemption-card-red-1")).toHaveTextContent(
      "ABC123",
    );
    expect(screen.getByTestId("redemption-card-red-2")).toHaveTextContent(
      "DEF456",
    );
    expect(screen.getByTestId("redemption-card-red-3")).toHaveTextContent(
      "GHJ789",
    );
  });

  it("should show confirmation dialog when 'Marcar como Usado' is clicked", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-1",
      code: "ABC123",
      clientName: "John Doe",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    });

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "ABC123",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/redemptions\.confirmUseTitle/i),
      ).toBeInTheDocument();
    });
  });

  it("should call useAdminUseRedemption when confirmed", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-1",
      code: "ABC123",
      clientName: "John Doe",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    });

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "ABC123",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/redemptions\.confirmUseTitle/i),
      ).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", {
      name: /redemptions\.confirm/i,
    });
    await user.click(confirmButton);

    expect(mockUseMutateAsync).toHaveBeenCalledWith("ABC123");
  });

  it("should display error message when code is not found", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockRejectedValue(
      new ApiError("NOT_FOUND", "Código de resgate não encontrado", 404),
    );

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "NOTFND",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("validate-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("validate-error")).toHaveTextContent(
      "Código de resgate não encontrado",
    );
  });

  it("should clear error when a new validation succeeds", async () => {
    const user = userEvent.setup();

    mockValidateMutateAsync.mockRejectedValueOnce(
      new ApiError("NOT_FOUND", "Código de resgate não encontrado", 404),
    );

    renderWithProviders(<RedemptionsTab />);

    const input = screen.getByPlaceholderText(/redemptions\.codePlaceholder/i);
    const validateBtn = screen.getByRole("button", {
      name: /redemptions\.validate/i,
    });

    await user.type(input, "NOTFND");
    await user.click(validateBtn);

    await waitFor(() => {
      expect(screen.getByTestId("validate-error")).toBeInTheDocument();
    });

    mockValidateMutateAsync.mockResolvedValueOnce({
      id: "red-1",
      code: "ABC123",
      clientName: "John Doe",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    });

    await user.clear(input);
    await user.type(input, "ABC123");
    await user.click(validateBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("validate-error")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("validated-redemption-card")).toBeInTheDocument();
  });

  it("should display error when mark-as-used fails", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-1",
      code: "ABC123",
      clientName: "John Doe",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    });
    mockUseMutateAsync.mockRejectedValue(
      new ApiError("SERVER_ERROR", "Falha ao marcar como usado", 500),
    );

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "ABC123",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/redemptions\.confirmUseTitle/i),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /redemptions\.confirm/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("use-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("use-error")).toHaveTextContent(
      "Falha ao marcar como usado",
    );
  });

  it("should clear use error on next successful use", async () => {
    const user = userEvent.setup();
    mockValidateMutateAsync.mockResolvedValue({
      id: "red-1",
      code: "ABC123",
      clientName: "John Doe",
      rewardName: "Corte Grátis",
      rewardType: "FREE_SERVICE",
      status: "PENDING",
      createdAt: "2026-02-20T10:00:00.000Z",
      expiresAt: "2026-04-01T00:00:00.000Z",
      usedAt: null,
    });
    mockUseMutateAsync.mockRejectedValueOnce(
      new ApiError("SERVER_ERROR", "Falha ao marcar como usado", 500),
    );

    renderWithProviders(<RedemptionsTab />);

    await user.type(
      screen.getByPlaceholderText(/redemptions\.codePlaceholder/i),
      "ABC123",
    );
    await user.click(
      screen.getByRole("button", { name: /redemptions\.validate/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(/redemptions\.confirmUseTitle/i),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("button", { name: /redemptions\.confirm/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("use-error")).toBeInTheDocument();
    });

    mockUseMutateAsync.mockResolvedValueOnce({ id: "red-1" });

    await user.click(
      screen.getByRole("button", { name: /redemptions\.markAsUsed/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(/redemptions\.confirmUseTitle/i),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("button", { name: /redemptions\.confirm/i }),
    );

    await waitFor(() => {
      expect(screen.queryByTestId("use-error")).not.toBeInTheDocument();
    });
  });
});
