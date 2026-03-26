import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyAccount: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAuthUserEmailMap: vi.fn(),
}));

import { GET } from "../route";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function adminAuthenticated() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "admin-user-id",
    profileId: "admin-profile-id",
    role: "ADMIN",
  });
}

function adminUnauthorized() {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    response: NextResponse.json(
      { error: "UNAUTHORIZED", message: "Não autorizado" },
      { status: 401 },
    ),
  } as RequireAdminResult);
}

describe("GET /api/admin/loyalty/accounts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should return 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("should return 200 with accounts list including email", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");
    const { getAuthUserEmailMap } = await import("@/lib/supabase/admin");

    const mockAccounts = [
      {
        id: "acc-1",
        currentPoints: 500,
        tier: "GOLD",
        profileId: "profile-1",
        profile: {
          userId: "user-1",
          fullName: "John Doe",
        },
      },
      {
        id: "acc-2",
        currentPoints: 100,
        tier: "BRONZE",
        profileId: "profile-2",
        profile: {
          userId: "user-2",
          fullName: null,
        },
      },
    ];

    vi.mocked(prisma.loyaltyAccount.findMany).mockResolvedValue(
      mockAccounts as never,
    );
    vi.mocked(getAuthUserEmailMap).mockResolvedValue(
      new Map([
        ["user-1", "john@example.com"],
        ["user-2", "jane@example.com"],
      ]),
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0]).toMatchObject({
      id: "acc-1",
      userId: "user-1",
      fullName: "John Doe",
      email: "john@example.com",
      points: 500,
      tier: "GOLD",
    });
    expect(json.data[1]).toMatchObject({
      id: "acc-2",
      userId: "user-2",
      fullName: "Sem nome",
      email: "jane@example.com",
      points: 100,
      tier: "BRONZE",
    });
  });

  it("should return empty list when no accounts exist", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");
    const { getAuthUserEmailMap } = await import("@/lib/supabase/admin");

    vi.mocked(prisma.loyaltyAccount.findMany).mockResolvedValue([]);
    vi.mocked(getAuthUserEmailMap).mockResolvedValue(new Map());

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });
});
