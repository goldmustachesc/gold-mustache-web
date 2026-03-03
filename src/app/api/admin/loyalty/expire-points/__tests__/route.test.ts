import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.hoisted(() =>
  vi.fn<() => Promise<RequireAdminResult>>(),
);
const mockExpirePoints = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/services/loyalty/expiration.service", () => ({
  ExpirationService: {
    expirePoints: mockExpirePoints,
  },
}));

import { POST } from "../route";

function makeRequest() {
  return new Request("http://localhost:3001/api/admin/loyalty/expire-points", {
    method: "POST",
  });
}

describe("POST /api/admin/loyalty/expire-points", () => {
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

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
  });

  it("should return 200 with expiration summary", async () => {
    const summary = {
      processedCount: 5,
      totalPointsExpired: 350,
      affectedAccounts: 2,
    };
    mockExpirePoints.mockResolvedValue(summary);

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(summary);
  });

  it("should delegate to ExpirationService.expirePoints()", async () => {
    mockExpirePoints.mockResolvedValue({
      processedCount: 0,
      totalPointsExpired: 0,
      affectedAccounts: 0,
    });

    await POST(makeRequest());

    expect(mockExpirePoints).toHaveBeenCalledTimes(1);
  });
});
