import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.hoisted(() =>
  vi.fn<() => Promise<RequireAdminResult>>(),
);
const mockRecalculateTier = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pointTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    recalculateTier: mockRecalculateTier,
  },
}));

import { POST } from "../route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as Request;
}

function makeParams(accountId: string) {
  return { params: Promise.resolve({ accountId }) };
}

describe("/api/admin/loyalty/accounts/[accountId]/adjust", () => {
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

  describe("auth and validation", () => {
    it("should return 401 when admin is not authenticated", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json(
          { error: "UNAUTHORIZED", message: "Não autorizado" },
          { status: 401 },
        ),
      });

      const response = await POST(
        makeRequest({ points: 100, reason: "test" }),
        makeParams(VALID_UUID),
      );

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid account ID", async () => {
      const response = await POST(
        makeRequest({ points: 100, reason: "test" }),
        makeParams("not-a-uuid"),
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe("INVALID_ACCOUNT_ID");
    });

    it("should return 422 for invalid body", async () => {
      const response = await POST(
        makeRequest({ points: 0, reason: "" }),
        makeParams(VALID_UUID),
      );

      const data = await response.json();
      expect(response.status).toBe(422);
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 404 when account not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.loyaltyAccount.findUnique).mockResolvedValueOnce(null);

      const response = await POST(
        makeRequest({ points: 100, reason: "test" }),
        makeParams(VALID_UUID),
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 422 when insufficient points for debit", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.loyaltyAccount.findUnique).mockResolvedValueOnce({
        id: VALID_UUID,
        profileId: "p-1",
        currentPoints: 50,
        lifetimePoints: 50,
        tier: "BRONZE",
        referralCode: "ABC123",
        referredById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await POST(
        makeRequest({ points: -100, reason: "debit" }),
        makeParams(VALID_UUID),
      );

      const data = await response.json();
      expect(response.status).toBe(422);
      expect(data.error).toBe("INSUFFICIENT_POINTS");
    });
  });

  describe("recalculateTier after adjustment", () => {
    async function setupSuccessfulAdjust(
      initial: {
        currentPoints: number;
        lifetimePoints: number;
        tier: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
      },
      updated: {
        currentPoints: number;
        lifetimePoints: number;
        tier: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
      },
      refreshedTier: string,
    ) {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.loyaltyAccount.findUnique)
        .mockResolvedValueOnce({
          id: VALID_UUID,
          profileId: "p-1",
          referralCode: "ABC123",
          referredById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...initial,
        })
        .mockResolvedValueOnce({ tier: refreshedTier } as never);

      vi.mocked(prisma.loyaltyAccount.update).mockResolvedValue({
        id: VALID_UUID,
        profileId: "p-1",
        referralCode: "ABC123",
        referredById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...updated,
      });
      vi.mocked(prisma.pointTransaction.create).mockResolvedValue({} as never);
      vi.mocked(prisma.$transaction).mockImplementation(
        (promises) => Promise.all(promises as unknown as unknown[]) as never,
      );
      mockRecalculateTier.mockResolvedValue(undefined);
    }

    it("should call recalculateTier after positive point adjustment", async () => {
      await setupSuccessfulAdjust(
        { currentPoints: 100, lifetimePoints: 100, tier: "BRONZE" },
        { currentPoints: 200, lifetimePoints: 200, tier: "BRONZE" },
        "BRONZE",
      );

      const response = await POST(
        makeRequest({ points: 100, reason: "Bonus" }),
        makeParams(VALID_UUID),
      );

      expect(response.status).toBe(200);
      expect(mockRecalculateTier).toHaveBeenCalledWith(VALID_UUID);
    });

    it("should call recalculateTier after negative point adjustment", async () => {
      await setupSuccessfulAdjust(
        { currentPoints: 500, lifetimePoints: 500, tier: "SILVER" },
        { currentPoints: 400, lifetimePoints: 500, tier: "SILVER" },
        "SILVER",
      );

      const response = await POST(
        makeRequest({ points: -100, reason: "Correction" }),
        makeParams(VALID_UUID),
      );

      expect(response.status).toBe(200);
      expect(mockRecalculateTier).toHaveBeenCalledWith(VALID_UUID);
    });

    it("should include updated tier in response after recalculation", async () => {
      await setupSuccessfulAdjust(
        { currentPoints: 100, lifetimePoints: 100, tier: "BRONZE" },
        { currentPoints: 600, lifetimePoints: 600, tier: "BRONZE" },
        "SILVER",
      );

      const response = await POST(
        makeRequest({ points: 500, reason: "Big bonus" }),
        makeParams(VALID_UUID),
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data.tier).toBe("SILVER");
    });

    it("should return SILVER when adjustment crosses threshold from 499 to 501", async () => {
      await setupSuccessfulAdjust(
        { currentPoints: 499, lifetimePoints: 499, tier: "BRONZE" },
        { currentPoints: 501, lifetimePoints: 501, tier: "BRONZE" },
        "SILVER",
      );

      const response = await POST(
        makeRequest({ points: 2, reason: "Threshold crossing" }),
        makeParams(VALID_UUID),
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data.tier).toBe("SILVER");
    });
  });
});
