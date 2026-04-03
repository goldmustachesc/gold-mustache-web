import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useAdminAccountTransactions,
  useAdminAdjustPoints,
  useAdminExpiringPoints,
  useAdminLoyaltyAccounts,
  useAdminToggleReward,
} from "../useAdminLoyalty";

const accountsApiResponse = {
  data: {
    data: [
      {
        id: "acc-1",
        userId: "user-1",
        fullName: "Carlos Silva",
        email: "carlos@test.com",
        points: 100,
        tier: "SILVER",
      },
    ],
    meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
  },
};

const accountsData = accountsApiResponse.data.data;

/** Mesmo formato retornado por `select` em `useAdminLoyaltyAccounts`. */
const accountsQueryCacheValue = {
  accounts: accountsData,
  meta: accountsApiResponse.data.meta,
};

const defaultAccountsQueryKey = {
  page: 1,
  limit: 50,
  params: undefined as import("../useAdminLoyalty").AccountsParams | undefined,
};

const rewardsResponse = {
  data: [
    {
      id: "reward-1",
      title: "Corte gratis",
      pointsCost: 300,
      active: true,
    },
  ],
};

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function stubFetchOk(response: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    }),
  );
}

function stubFetchError(error: string, status = 400) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error, message: error }),
    }),
  );
}

describe("useAdminLoyaltyAccounts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca a lista de contas de fidelidade do admin", async () => {
    stubFetchOk(accountsApiResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useAdminLoyaltyAccounts(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/accounts?page=1&limit=50",
      undefined,
    );
    expect(result.current.data).toEqual({
      accounts: accountsData,
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
  });

  it("inclui filtros e ordenação na URL e no queryKey", async () => {
    stubFetchOk(accountsApiResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const params = {
      search: "João",
      tier: "GOLD" as const,
      sortBy: "lifetimePoints" as const,
      sortOrder: "asc" as const,
    };

    const { result } = renderHook(
      () => useAdminLoyaltyAccounts(2, 25, params),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/api/admin/loyalty/accounts?",
    );
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const qs = new URLSearchParams(calledUrl.split("?")[1]);
    expect(qs.get("page")).toBe("2");
    expect(qs.get("limit")).toBe("25");
    expect(qs.get("search")).toBe("João");
    expect(qs.get("tier")).toBe("GOLD");
    expect(qs.get("sortBy")).toBe("lifetimePoints");
    expect(qs.get("sortOrder")).toBe("asc");

    const cached = queryClient.getQueryData([
      "admin",
      "loyalty",
      "accounts",
      { page: 2, limit: 25, params },
    ]);
    expect(cached).toBeDefined();
  });
});

describe("useAdminAccountTransactions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca transações quando enabled é true", async () => {
    const txResponse = {
      data: {
        data: [
          {
            id: "tx-1",
            loyaltyAccountId: "acc-1",
            type: "EARN",
            points: 10,
            description: "Corte",
            referenceId: null,
            expiresAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
    };
    stubFetchOk(txResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => useAdminAccountTransactions("acc-1", 1, 50, true),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/accounts/acc-1/transactions?page=1&limit=50",
      undefined,
    );
    expect(result.current.data).toEqual(txResponse.data.data);
  });

  it("não dispara fetch quando enabled é false", async () => {
    stubFetchOk({
      data: { data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => useAdminAccountTransactions("acc-1", 1, 50, false),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(result.current.data).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("useAdminExpiringPoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca pontos prestes a expirar", async () => {
    const expiring = [
      { id: "tx-1", points: 100, expiresAt: "2026-07-01T00:00:00.000Z" },
    ];
    stubFetchOk({ data: expiring });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useAdminExpiringPoints(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/expiring-points",
      undefined,
    );
    expect(result.current.data).toEqual(expiring);
  });
});

describe("useAdminAdjustPoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("faz update otimista e invalida a lista no sucesso", async () => {
    stubFetchOk({ success: true, message: "ok" });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const cacheKey = [
      "admin",
      "loyalty",
      "accounts",
      { ...defaultAccountsQueryKey },
    ];
    queryClient.setQueryData(cacheKey, accountsQueryCacheValue);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAdminAdjustPoints(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        accountId: "acc-1",
        points: 25,
        reason: "Bonus",
      });
    });

    const cached = queryClient.getQueryData(cacheKey) as {
      accounts: Array<{ points: number }>;
    };
    expect(cached.accounts[0].points).toBe(125);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "loyalty", "accounts"],
      exact: false,
    });
  });

  it("restaura os pontos anteriores quando a mutation falha", async () => {
    stubFetchError("ADJUST_FAILED", 500);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const cacheKey = [
      "admin",
      "loyalty",
      "accounts",
      { ...defaultAccountsQueryKey },
    ];
    queryClient.setQueryData(cacheKey, accountsQueryCacheValue);

    const { result } = renderHook(() => useAdminAdjustPoints(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          accountId: "acc-1",
          points: -250,
          reason: "Erro",
        }),
      ).rejects.toThrow("ADJUST_FAILED");
    });

    expect(queryClient.getQueryData(cacheKey)).toEqual(accountsQueryCacheValue);
  });

  it("mantém cache ausente no update otimista quando a lista ainda não foi carregada", async () => {
    stubFetchOk({ success: true, message: "ok" });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { result } = renderHook(() => useAdminAdjustPoints(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        accountId: "acc-1",
        points: 10,
        reason: "Bônus",
      });
    });

    const allQueries = queryClient.getQueriesData({
      queryKey: ["admin", "loyalty", "accounts"],
    });
    expect(allQueries.length).toBe(0);
  });
});

describe("useAdminToggleReward", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("atualiza otimisticamente caches publica e admin e invalida no sucesso", async () => {
    stubFetchOk({
      data: {
        ...rewardsResponse.data[0],
        active: false,
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(["loyalty", "rewards"], rewardsResponse.data);
    queryClient.setQueryData(
      ["admin", "loyalty", "rewards"],
      rewardsResponse.data,
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAdminToggleReward(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ rewardId: "reward-1", active: false });
    });

    expect(queryClient.getQueryData(["loyalty", "rewards"])).toEqual([
      { ...rewardsResponse.data[0], active: false },
    ]);
    expect(queryClient.getQueryData(["admin", "loyalty", "rewards"])).toEqual([
      { ...rewardsResponse.data[0], active: false },
    ]);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["loyalty", "rewards"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "loyalty", "rewards"],
    });
  });

  it("restaura os caches quando o toggle falha", async () => {
    stubFetchError("TOGGLE_FAILED", 500);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(["loyalty", "rewards"], rewardsResponse.data);
    queryClient.setQueryData(
      ["admin", "loyalty", "rewards"],
      rewardsResponse.data,
    );

    const { result } = renderHook(() => useAdminToggleReward(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ rewardId: "reward-1", active: false }),
      ).rejects.toThrow("TOGGLE_FAILED");
    });

    expect(queryClient.getQueryData(["loyalty", "rewards"])).toEqual(
      rewardsResponse.data,
    );
    expect(queryClient.getQueryData(["admin", "loyalty", "rewards"])).toEqual(
      rewardsResponse.data,
    );
  });

  it("não altera caches públicos quando ainda não existem dados locais", async () => {
    stubFetchOk({
      data: {
        ...rewardsResponse.data[0],
        active: false,
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { result } = renderHook(() => useAdminToggleReward(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ rewardId: "reward-1", active: false });
    });

    expect(queryClient.getQueryData(["loyalty", "rewards"])).toBeUndefined();
    expect(
      queryClient.getQueryData(["admin", "loyalty", "rewards"]),
    ).toBeUndefined();
  });
});
