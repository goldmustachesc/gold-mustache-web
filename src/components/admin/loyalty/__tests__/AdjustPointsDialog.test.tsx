import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminLoyaltyAccountExtended } from "@/hooks/useAdminLoyalty";
import { AdjustPointsDialog } from "../AdjustPointsDialog";

const mutateAsync = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminAdjustPoints: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockAccount: AdminLoyaltyAccountExtended = {
  id: "acc-1",
  userId: "u-1",
  fullName: "Test User",
  email: "test@test.com",
  points: 100,
  tier: "BRONZE",
  lifetimePoints: 200,
  memberSince: "2024-01-01",
  redemptionCount: 0,
};

describe("AdjustPointsDialog", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(undefined);
  });

  it("renderiza o diálogo quando aberto com dados da conta", () => {
    const onClose = vi.fn();
    render(<AdjustPointsDialog open account={mockAccount} onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText(/100\s+pts/)).toBeInTheDocument();
  });

  it("chama onClose ao cancelar", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AdjustPointsDialog open account={mockAccount} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("chama mutateAsync do useAdminAdjustPoints ao salvar com valores válidos", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AdjustPointsDialog open account={mockAccount} onClose={onClose} />);

    await user.clear(screen.getByLabelText(/^Pontos$/i));
    await user.type(screen.getByLabelText(/^Pontos$/i), "50");
    await user.type(screen.getByLabelText(/reason/i), "Bônus");

    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      accountId: "acc-1",
      points: 50,
      reason: "Bônus",
    });
  });
});
