import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.hoisted(() =>
  vi.fn<() => Promise<RequireAdminResult>>(),
);
const mockGetExpiringTransactions = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/services/loyalty/expiration.service", () => ({
  ExpirationService: {
    getExpiringTransactions: mockGetExpiringTransactions,
  },
}));

import { GET } from "../route";

function makeRequest() {
  return new Request(
    "http://localhost:3001/api/admin/loyalty/expiring-points",
    { method: "GET" },
  );
}

describe("GET /api/admin/loyalty/expiring-points", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      userId: "admin-user-id",
      profileId: "admin-profile-id",
      role: "ADMIN",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when admin is not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      ),
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
  });

  it("should return 200 with expiring transactions list", async () => {
    const transactions = [
      { id: "tx-1", points: 100, expiresAt: "2025-07-01T00:00:00.000Z" },
      { id: "tx-2", points: 50, expiresAt: "2025-07-10T00:00:00.000Z" },
    ];
    mockGetExpiringTransactions.mockResolvedValue(transactions);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(transactions);
  });

  it("should delegate to ExpirationService.getExpiringTransactions()", async () => {
    mockGetExpiringTransactions.mockResolvedValue([]);

    await GET(makeRequest());

    expect(mockGetExpiringTransactions).toHaveBeenCalledTimes(1);
  });
});
