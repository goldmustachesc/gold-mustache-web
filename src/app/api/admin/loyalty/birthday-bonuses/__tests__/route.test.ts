import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.hoisted(() =>
  vi.fn<() => Promise<RequireAdminResult>>(),
);
const mockCreditBirthdayBonuses = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/services/loyalty/birthday.service", () => ({
  BirthdayService: {
    creditBirthdayBonuses: mockCreditBirthdayBonuses,
  },
}));

import { POST } from "../route";

function makeRequest() {
  return new Request(
    "http://localhost:3001/api/admin/loyalty/birthday-bonuses",
    { method: "POST" },
  );
}

describe("POST /api/admin/loyalty/birthday-bonuses", () => {
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

  it("should return 200 with birthday bonus summary", async () => {
    const summary = {
      processedCount: 3,
      totalPointsCredited: 300,
      failedCount: 0,
    };
    mockCreditBirthdayBonuses.mockResolvedValue(summary);

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(summary);
  });

  it("should delegate to BirthdayService.creditBirthdayBonuses()", async () => {
    mockCreditBirthdayBonuses.mockResolvedValue({
      processedCount: 0,
      totalPointsCredited: 0,
      failedCount: 0,
    });

    await POST(makeRequest());

    expect(mockCreditBirthdayBonuses).toHaveBeenCalledTimes(1);
  });

  it("should return 500 when service throws unexpected error", async () => {
    mockCreditBirthdayBonuses.mockRejectedValue(
      new Error("Unexpected failure") as never,
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("INTERNAL_ERROR");

    consoleSpy.mockRestore();
  });
});
