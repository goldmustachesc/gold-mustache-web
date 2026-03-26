import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLoyaltyTransactions } from "@/hooks/useLoyalty";

const MOCK_TRANSACTIONS = [
  {
    id: "tx-1",
    createdAt: "2026-03-01T10:00:00.000Z",
    description: "Agendamento concluído: Corte",
    type: "EARNED_APPOINTMENT",
    points: 50,
  },
  {
    id: "tx-2",
    createdAt: "2026-02-28T14:00:00.000Z",
    description: "Resgate: Barba Grátis",
    type: "REDEEMED",
    points: -200,
  },
];

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

function stubFetchError() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({ error: "UNAUTHORIZED", message: "Não autorizado" }),
    }),
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useLoyaltyTransactions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call GET /api/loyalty/transactions", async () => {
    stubFetch(MOCK_TRANSACTIONS);

    renderHook(() => useLoyaltyTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/loyalty/transactions",
        undefined,
      );
    });
  });

  it("should return transaction list on success", async () => {
    stubFetch(MOCK_TRANSACTIONS);

    const { result } = renderHook(() => useLoyaltyTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toMatchObject({
      id: "tx-1",
      description: "Agendamento concluído: Corte",
      type: "EARNED_APPOINTMENT",
      points: 50,
    });
  });

  it("should return error state when API fails", async () => {
    stubFetchError();

    const { result } = renderHook(() => useLoyaltyTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
