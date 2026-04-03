import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RewardModal } from "../RewardModal";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  rewardError: null as Error | null,
  isPending: false,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueryData: mocks.setQueryData,
    invalidateQueries: mocks.invalidateQueries,
  }),
}));

vi.mock("@/hooks/useAdminRewards", () => ({
  useAdminCreateReward: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: mocks.isPending,
    error: mocks.rewardError,
  }),
  useAdminReward: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useAdminUpdateReward: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({
    children,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode; className?: string }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("../RewardForm", () => ({
  RewardForm: ({
    onSubmit,
    isLoading,
  }: {
    onSubmit: (data: {
      name: string;
      description?: string;
      pointsCost: number;
      type: "DISCOUNT" | "FREE_SERVICE" | "PRODUCT";
      value?: number;
      imageUrl?: string;
      stock?: number;
      active: boolean;
    }) => Promise<void>;
    isLoading?: boolean;
  }) => (
    <div>
      <span>{isLoading ? "form-loading" : "form-idle"}</span>
      <button
        type="button"
        onClick={() =>
          void onSubmit({
            name: "Pomada modeladora",
            description: "Produto premium",
            pointsCost: 400,
            type: "PRODUCT",
            value: undefined,
            imageUrl: "https://goldmustache.com/reward.png",
            stock: 5,
            active: true,
          })
        }
      >
        enviar-reward
      </button>
    </div>
  ),
}));

describe("RewardModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPending = false;
    mocks.rewardError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("faz optimistic update, mostra sucesso e fecha automaticamente", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    mocks.mutateAsync.mockResolvedValue({ id: "reward-1" });
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    render(<RewardModal open onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("enviar-reward"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.setQueryData).toHaveBeenCalledTimes(2);
    expect(mocks.setQueryData).toHaveBeenNthCalledWith(
      1,
      ["loyalty", "rewards"],
      expect.any(Function),
    );
    expect(mocks.setQueryData).toHaveBeenNthCalledWith(
      2,
      ["admin", "loyalty", "rewards"],
      expect.any(Function),
    );
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      name: "Pomada modeladora",
      description: "Produto premium",
      pointsCost: 400,
      type: "PRODUCT",
      value: undefined,
      imageUrl: "https://goldmustache.com/reward.png",
      stock: 5,
      active: true,
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("remove o optimistic update e invalida caches quando ocorre erro", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.rewardError = new Error("Falha ao criar recompensa");
    mocks.mutateAsync.mockRejectedValue(new Error("Falha ao criar recompensa"));

    render(<RewardModal open onOpenChange={vi.fn()} />);

    await user.click(screen.getByText("enviar-reward"));

    await waitFor(() => {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["loyalty", "rewards"],
      });
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    });

    expect(screen.getByText("Erro ao criar recompensa")).toBeInTheDocument();
    expect(screen.getByText("Falha ao criar recompensa")).toBeInTheDocument();
  });

  it("nao fecha o modal enquanto a mutation esta pendente", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    mocks.isPending = true;

    render(<RewardModal open onOpenChange={onOpenChange} />);

    expect(screen.getByText("form-loading")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
