import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useBarberFinancialStats,
  useAdminFinancialStats,
  getLastMonths,
} from "../useFinancialStats";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

const MOCK_BARBER_RESPONSE = {
  stats: { revenue: 5000, appointments: 40 },
  barberName: "Carlos",
};

const MOCK_ADMIN_RESPONSE = {
  stats: { revenue: 15000, appointments: 120 },
  barberName: "All",
  barbers: [{ id: "b-1", name: "Carlos" }],
};

describe("useBarberFinancialStats", () => {
  it("calls GET /api/barbers/me/financial with month and year", async () => {
    stubFetch(MOCK_BARBER_RESPONSE);

    renderHook(() => useBarberFinancialStats(3, 2026), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/barbers/me/financial?month=3&year=2026",
        undefined,
      );
    });
  });

  it("returns financial data on success", async () => {
    stubFetch(MOCK_BARBER_RESPONSE);

    const { result } = renderHook(() => useBarberFinancialStats(3, 2026), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_BARBER_RESPONSE);
  });
});

describe("useAdminFinancialStats", () => {
  it("calls GET /api/admin/financial with month and year", async () => {
    stubFetch(MOCK_ADMIN_RESPONSE);

    renderHook(() => useAdminFinancialStats(3, 2026), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/financial?"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("month=3"),
        undefined,
      );
    });
  });

  it("includes barberId param when provided", async () => {
    stubFetch(MOCK_ADMIN_RESPONSE);

    renderHook(() => useAdminFinancialStats(3, 2026, "b-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("barberId=b-1"),
        undefined,
      );
    });
  });
});

describe("getLastMonths", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 2, 5) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the specified count of months", () => {
    const months = getLastMonths(4);
    expect(months).toHaveLength(4);
  });

  it("returns months in chronological order (oldest first)", () => {
    const months = getLastMonths(3);
    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1].year * 12 + months[i - 1].month;
      const curr = months[i].year * 12 + months[i].month;
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("current month label has no year suffix", () => {
    const months = getLastMonths(4);
    expect(months[3].label).toBe("MAR");
  });

  it("past months have year suffix", () => {
    const months = getLastMonths(4);
    expect(months[0].label).toBe("DEZ 25");
    expect(months[1].label).toBe("JAN 26");
    expect(months[2].label).toBe("FEV 26");
  });

  it("defaults to 4 months when no count provided", () => {
    const months = getLastMonths();
    expect(months).toHaveLength(4);
  });
});
