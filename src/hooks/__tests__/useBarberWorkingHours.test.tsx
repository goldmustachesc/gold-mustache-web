import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useMyWorkingHours,
  useUpdateMyWorkingHours,
  useBarberWorkingHours,
  useUpdateBarberWorkingHours,
} from "../useBarberWorkingHours";

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

let queryClient: QueryClient;

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const MOCK_DAYS = [
  { dayOfWeek: 1, isWorking: true, startTime: "09:00", endTime: "18:00" },
];

describe("useMyWorkingHours", () => {
  it("calls GET /api/barbers/me/working-hours", async () => {
    stubFetch(MOCK_DAYS);

    renderHook(() => useMyWorkingHours(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/barbers/me/working-hours",
        undefined,
      );
    });
  });
});

describe("useUpdateMyWorkingHours", () => {
  it("calls PUT /api/barbers/me/working-hours and invalidates queries", async () => {
    stubFetch(MOCK_DAYS);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateMyWorkingHours(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ days: MOCK_DAYS });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/barbers/me/working-hours",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["my-working-hours"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["slots"],
      exact: false,
    });
  });
});

describe("useBarberWorkingHours", () => {
  it("does not fetch when barberId is null", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useBarberWorkingHours(null), {
      wrapper: createWrapper(),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls GET /api/admin/barbers/:id/working-hours", async () => {
    stubFetch({ barber: { id: "b-1", name: "Carlos" }, days: MOCK_DAYS });

    renderHook(() => useBarberWorkingHours("b-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/barbers/b-1/working-hours",
        undefined,
      );
    });
  });
});

describe("useUpdateBarberWorkingHours", () => {
  it("calls PUT /api/admin/barbers/:id/working-hours and invalidates queries", async () => {
    stubFetch({ barber: { id: "b-1", name: "Carlos" }, days: MOCK_DAYS });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateBarberWorkingHours(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ barberId: "b-1", input: { days: MOCK_DAYS } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/barbers/b-1/working-hours",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["barber-working-hours", "b-1"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["slots"],
      exact: false,
    });
  });
});
