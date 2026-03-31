import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useBarbers,
  useServices,
  useSlots,
  useClientAppointments,
  useBarberAppointments,
  useGuestAppointments,
} from "../useBooking";

vi.mock("@/lib/guest-session", () => ({
  getGuestToken: vi.fn().mockReturnValue("guest-token-123"),
  setGuestToken: vi.fn(),
  clearGuestToken: vi.fn(),
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

describe("useBarbers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches barbers from /api/barbers", async () => {
    stubFetch([{ id: "b-1", name: "Carlos" }]);
    const { result } = renderHook(() => useBarbers(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "b-1", name: "Carlos" }]);
  });
});

describe("useServices", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches all services when no barberId", async () => {
    stubFetch([{ id: "s-1", name: "Corte" }]);
    renderHook(() => useServices(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/services", undefined);
    });
  });

  it("fetches services filtered by barberId", async () => {
    stubFetch([{ id: "s-1", name: "Corte" }]);
    renderHook(() => useServices("b-1"), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/services?barberId=b-1",
        undefined,
      );
    });
  });
});

describe("useSlots", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does not fetch when parameters are null", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderHook(() => useSlots(null, null, null), {
      wrapper: createWrapper(),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches slots when all parameters are provided", async () => {
    stubFetch([{ time: "09:00", available: true }]);
    const { result } = renderHook(() => useSlots("2026-03-10", "b-1", "s-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/slots?date=2026-03-10&barberId=b-1&serviceId=s-1",
      undefined,
    );
  });
});

describe("useClientAppointments", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches client appointments", async () => {
    stubFetch([{ id: "apt-1" }]);
    const { result } = renderHook(() => useClientAppointments(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "apt-1" }]);
  });
});

describe("useBarberAppointments", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does not fetch when barberId is null", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderHook(() => useBarberAppointments(null, null, null), {
      wrapper: createWrapper(),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches barber appointments with date range", async () => {
    stubFetch([{ id: "apt-1" }]);
    const { result } = renderHook(
      () =>
        useBarberAppointments(
          "b-1",
          new Date("2026-03-01"),
          new Date("2026-03-31"),
        ),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/appointments?barberId=b-1"),
      undefined,
    );
  });
});

describe("useGuestAppointments", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches guest appointments with token header", async () => {
    stubFetch([{ id: "apt-g1" }]);
    const { result } = renderHook(() => useGuestAppointments(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/appointments/guest/lookup", {
      headers: { "X-Guest-Token": "guest-token-123" },
    });
  });
});
