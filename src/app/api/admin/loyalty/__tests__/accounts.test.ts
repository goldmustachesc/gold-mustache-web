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
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAuthUserEmailsByIds: vi.fn(),
}));

import { GET } from "../accounts/route";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function makeRequest(params?: Record<string, string>): Request {
  const url = new URL("http://localhost:3001/api/admin/loyalty/accounts");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url);
}

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

describe("GET /api/admin/loyalty/accounts — filtros, ordenação e campos estendidos", () => {
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

  it("should apply search on profile.fullName (contains, insensitive)", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");
    const { getAuthUserEmailsByIds } = await import("@/lib/supabase/admin");

    vi.mocked(prisma.loyaltyAccount.findMany).mockResolvedValue([]);
    vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(0);
    vi.mocked(getAuthUserEmailsByIds).mockResolvedValue(new Map());

    await GET(makeRequest({ search: "  Maria  " }));

    expect(prisma.loyaltyAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          profile: { fullName: { contains: "Maria", mode: "insensitive" } },
        }),
      }),
    );
    expect(prisma.loyaltyAccount.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          profile: { fullName: { contains: "Maria", mode: "insensitive" } },
        }),
      }),
    );
  });

  it("should filter by tier when tier query param is set", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");
    const { getAuthUserEmailsByIds } = await import("@/lib/supabase/admin");

    vi.mocked(prisma.loyaltyAccount.findMany).mockResolvedValue([]);
    vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(0);
    vi.mocked(getAuthUserEmailsByIds).mockResolvedValue(new Map());

    await GET(makeRequest({ tier: "GOLD" }));

    expect(prisma.loyaltyAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tier: "GOLD" }),
      }),
    );
  });

  it("should order by lifetimePoints asc when sortBy and sortOrder are set", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");
    const { getAuthUserEmailsByIds } = await import("@/lib/supabase/admin");

    vi.mocked(prisma.loyaltyAccount.findMany).mockResolvedValue([]);
    vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(0);
    vi.mocked(getAuthUserEmailsByIds).mockResolvedValue(new Map());

    await GET(makeRequest({ sortBy: "lifetimePoints", sortOrder: "asc" }));

    expect(prisma.loyaltyAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { lifetimePoints: "asc" },
      }),
    );
  });

  it("should return lifetimePoints, memberSince, and redemptionCount in each item", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");
    const { getAuthUserEmailsByIds } = await import("@/lib/supabase/admin");

    const createdAt = new Date("2025-06-15T10:00:00.000Z");
    const mockAccounts = [
      {
        id: "acc-1",
        currentPoints: 500,
        lifetimePoints: 1200,
        tier: "GOLD",
        createdAt,
        profileId: "profile-1",
        profile: {
          userId: "user-1",
          fullName: "John Doe",
        },
        _count: { redemptions: 4 },
      },
    ];

    vi.mocked(prisma.loyaltyAccount.findMany).mockResolvedValue(
      mockAccounts as never,
    );
    vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(1);
    vi.mocked(getAuthUserEmailsByIds).mockResolvedValue(
      new Map([["user-1", "john@example.com"]]),
    );

    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.data[0]).toMatchObject({
      lifetimePoints: 1200,
      memberSince: createdAt.toISOString(),
      redemptionCount: 4,
    });
  });
});
