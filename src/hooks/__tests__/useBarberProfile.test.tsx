import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useBarberProfile } from "../useBarberProfile";

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useBarberProfile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch when user is null", () => {
    mockUseUser.mockReturnValue({ data: null });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useBarberProfile(), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls GET /api/barbers/me when user exists", async () => {
    mockUseUser.mockReturnValue({ data: { id: "u-1" } });
    stubFetch({ id: "b-1", name: "Carlos", avatarUrl: null });

    renderHook(() => useBarberProfile(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/barbers/me", undefined);
    });
  });

  it("returns barber data on success", async () => {
    mockUseUser.mockReturnValue({ data: { id: "u-1" } });
    stubFetch({ id: "b-1", name: "Carlos", avatarUrl: null });

    const { result } = renderHook(() => useBarberProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      id: "b-1",
      name: "Carlos",
      avatarUrl: null,
    });
  });

  it("returns null on 404", async () => {
    mockUseUser.mockReturnValue({ data: { id: "u-1" } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({ error: "NOT_FOUND", message: "Not found" }),
      }),
    );

    const { result } = renderHook(() => useBarberProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
