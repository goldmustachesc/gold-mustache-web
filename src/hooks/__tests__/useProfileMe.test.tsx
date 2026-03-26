import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useProfileMe } from "../useProfileMe";

const mockUseUser = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAuth", () => ({
  useUser: mockUseUser,
}));

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

function stubFetchError(status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () =>
        Promise.resolve({ error: "SERVER_ERROR", message: "Server error" }),
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

describe("useProfileMe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch when user is null", () => {
    mockUseUser.mockReturnValue({ data: null });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useProfileMe(), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls GET /api/profile/me when user exists", async () => {
    mockUseUser.mockReturnValue({ data: { id: "u-1" } });
    stubFetch({ profile: { id: "p-1", fullName: "João" } });

    renderHook(() => useProfileMe(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/profile/me", undefined);
    });
  });

  it("returns unwrapped profile from response", async () => {
    mockUseUser.mockReturnValue({ data: { id: "u-1" } });
    stubFetch({ profile: { id: "p-1", fullName: "João", phone: "11999" } });

    const { result } = renderHook(() => useProfileMe(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      id: "p-1",
      fullName: "João",
      phone: "11999",
    });
  });

  it("returns error state on API failure", async () => {
    mockUseUser.mockReturnValue({ data: { id: "u-1" } });
    stubFetchError();

    const { result } = renderHook(() => useProfileMe(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
