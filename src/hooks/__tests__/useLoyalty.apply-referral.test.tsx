import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useApplyReferral } from "../useLoyalty";

function stubFetch(response: { ok: boolean; status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      json: () => Promise.resolve(response.body),
    }),
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("useApplyReferral", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call POST /api/loyalty/referral/apply with the code", async () => {
    stubFetch({
      ok: true,
      status: 200,
      body: { data: { applied: true, referrerName: "João S." } },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useApplyReferral(), { wrapper });

    await act(() => result.current.mutateAsync("ABC123"));

    expect(fetch).toHaveBeenCalledWith("/api/loyalty/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "ABC123" }),
    });
  });

  it("should invalidate loyalty/account query on success", async () => {
    stubFetch({
      ok: true,
      status: 200,
      body: { data: { applied: true, referrerName: "João S." } },
    });

    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useApplyReferral(), { wrapper });

    await act(() => result.current.mutateAsync("ABC123"));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["loyalty", "account"],
    });
  });

  it("should throw ApiError when API returns 400", async () => {
    stubFetch({
      ok: false,
      status: 400,
      body: {
        error: "BAD_REQUEST",
        message: "Esta conta já foi indicada por outro usuário",
      },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useApplyReferral(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync("REF123")).rejects.toThrow(
        "Esta conta já foi indicada por outro usuário",
      );
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
