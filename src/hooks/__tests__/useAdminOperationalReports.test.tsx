import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAdminOperationalReports } from "../useAdminOperationalReports";

let queryClient: QueryClient;

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminOperationalReports", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              period: {
                month: 3,
                year: 2026,
                startDate: "2026-03-01",
                endDate: "2026-03-31",
              },
              noShow: {
                totalNoShows: 0,
                totalLostRevenue: 0,
                byBarber: [],
              },
              retention: {
                asOf: "2026-03-31",
                registeredClients: {
                  totalWithHistory: 0,
                  inactive30Days: 0,
                  inactive60Days: 0,
                  inactive90Days: 0,
                },
                guestClients: {
                  totalWithHistory: 0,
                  inactive30Days: 0,
                  inactive60Days: 0,
                  inactive90Days: 0,
                },
              },
            },
          }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("consulta endpoint com mês e ano", async () => {
    renderHook(() => useAdminOperationalReports(3, 2026), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/reports/operations?month=3&year=2026",
      undefined,
    );
  });
});
