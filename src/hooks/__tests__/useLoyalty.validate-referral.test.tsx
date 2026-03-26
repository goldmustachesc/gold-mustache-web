import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useValidateReferral } from "../useLoyalty";

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

describe("useValidateReferral", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call POST /api/loyalty/referral/validate with the code", async () => {
    stubFetch({
      ok: true,
      status: 200,
      body: { data: { valid: true, referrerName: "João S." } },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useValidateReferral(), { wrapper });

    await act(() => result.current.mutateAsync("ABC123"));

    expect(fetch).toHaveBeenCalledWith("/api/loyalty/referral/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "ABC123" }),
    });
  });

  it("should invalidate loyalty/account query on success", async () => {
    stubFetch({
      ok: true,
      status: 200,
      body: { data: { valid: true, referrerName: "João S." } },
    });

    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useValidateReferral(), { wrapper });

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
        message: "Você não pode usar seu próprio código de indicação",
      },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useValidateReferral(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync("MYCODE")).rejects.toThrow(
        "Você não pode usar seu próprio código de indicação",
      );
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
