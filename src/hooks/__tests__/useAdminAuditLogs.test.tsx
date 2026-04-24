import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAdminAuditLogs } from "../useAdminAuditLogs";

let queryClient: QueryClient;

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminAuditLogs", () => {
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
            data: [],
            meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
          }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("monta query string com filtros informados", async () => {
    renderHook(
      () =>
        useAdminAuditLogs({
          page: 2,
          limit: 50,
          action: "REWARD_CREATE",
          resourceType: "reward",
          actorProfileId: "550e8400-e29b-41d4-a716-446655440000",
          from: "2026-04-01",
          to: "2026-04-30",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      undefined,
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=50"),
      undefined,
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("action=REWARD_CREATE"),
      undefined,
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("resourceType=reward"),
      undefined,
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "actorProfileId=550e8400-e29b-41d4-a716-446655440000",
      ),
      undefined,
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("from=2026-04-01"),
      undefined,
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("to=2026-04-30"),
      undefined,
    );
  });
});
