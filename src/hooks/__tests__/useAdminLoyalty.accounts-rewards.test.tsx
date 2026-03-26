import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useAdminAdjustPoints,
  useAdminLoyaltyAccounts,
  useAdminToggleReward,
} from "../useAdminLoyalty";

const accountsResponse = {
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
    stubFetchOk(accountsResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useAdminLoyaltyAccounts(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/loyalty/accounts",
      undefined,
    );
    expect(result.current.data).toEqual(accountsResponse.data);
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
    queryClient.setQueryData(
      ["admin", "loyalty", "accounts"],
      accountsResponse.data,
    );
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

    expect(queryClient.getQueryData(["admin", "loyalty", "accounts"])).toEqual([
      {
        ...accountsResponse.data[0],
        points: 125,
      },
    ]);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "loyalty", "accounts"],
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
    queryClient.setQueryData(
      ["admin", "loyalty", "accounts"],
      accountsResponse.data,
    );

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

    expect(queryClient.getQueryData(["admin", "loyalty", "accounts"])).toEqual(
      accountsResponse.data,
    );
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

    expect(
      queryClient.getQueryData(["admin", "loyalty", "accounts"]),
    ).toBeUndefined();
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
