import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseLoyaltyTransactions = vi.hoisted(() => vi.fn());
const EMPTY_MESSAGE = "Nenhuma movimenta\u00e7\u00e3o de pontos ainda.";

vi.mock("@/hooks/useLoyalty", () => ({
  useLoyaltyTransactions: (...args: unknown[]) =>
    mockUseLoyaltyTransactions(...args),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("next-intl", async () => {
  const { default: ptBRLoyalty } = await import(
    "@/i18n/locales/pt-BR/loyalty.json"
  );

  function resolveMessage(path: string): string | undefined {
    return path.split(".").reduce<unknown>(
      (current, segment) => {
        if (!current || typeof current !== "object") {
          return undefined;
        }

        return (current as Record<string, unknown>)[segment];
      },
      { loyalty: ptBRLoyalty },
    ) as string | undefined;
  }

  return {
    useTranslations: (namespace: string) => (key: string) =>
      resolveMessage(`${namespace}.${key}`) ?? `${namespace}.${key}`,
  };
});

import LoyaltyHistoryPage from "../page";

describe("LoyaltyHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoyaltyTransactions.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it("renders translated empty state when client has no loyalty transactions", () => {
    render(<LoyaltyHistoryPage />);

    expect(screen.getAllByText(EMPTY_MESSAGE)).toHaveLength(2);
    expect(screen.queryAllByText("loyalty.history.empty")).toHaveLength(0);
  });

  it("renders translated labels for detailed transaction enum types", () => {
    mockUseLoyaltyTransactions.mockReturnValue({
      data: [
        {
          id: "tx-1",
          createdAt: "2026-04-01T12:00:00.000Z",
          description: "Agendamento concluído: Corte",
          type: "EARNED_APPOINTMENT",
          points: 50,
        },
      ],
      isLoading: false,
    });

    render(<LoyaltyHistoryPage />);

    expect(screen.getAllByText("Ganho por agendamento").length).toBeGreaterThan(
      0,
    );
  });
});
