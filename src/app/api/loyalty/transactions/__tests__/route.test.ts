import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    pointTransaction: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    getOrCreateAccount: vi.fn(),
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function authenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
}

function unauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
  });
}

function mockProfile(profileId = "profile-1") {
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    id: profileId,
  } as never);
}

function mockAccount(accountId = "acc-1") {
  vi.mocked(LoyaltyService.getOrCreateAccount).mockResolvedValue({
    id: accountId,
    profileId: "profile-1",
    currentPoints: 500,
    lifetimePoints: 1000,
    tier: "BRONZE",
    referralCode: "ABCDEF",
    referredById: null,
    tierUpdatedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  } as never);
}

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3001/api/loyalty/transactions");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return { url: url.toString() } as Request;
}

describe("/api/loyalty/transactions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("should return 401 when not authenticated", async () => {
      unauthenticatedUser();

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("should return 404 when profile not found", async () => {
      authenticatedUser();
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 200 with paginated transactions", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const transactions = [
        {
          id: "tx-1",
          points: 100,
          type: "BOOKING",
          description: "Corte de cabelo",
          loyaltyAccountId: "acc-1",
          createdAt: NOW,
        },
      ];

      vi.mocked(prisma.pointTransaction.findMany).mockResolvedValue(
        transactions as never,
      );
      vi.mocked(prisma.pointTransaction.count).mockResolvedValue(1);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.meta).toMatchObject({
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });

    it("should respect pagination params (page, limit)", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      vi.mocked(prisma.pointTransaction.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.pointTransaction.count).mockResolvedValue(25);

      const response = await GET(createGetRequest({ page: "3", limit: "5" }));
      const data = await response.json();

      expect(data.meta).toMatchObject({
        total: 25,
        page: 3,
        limit: 5,
        totalPages: 5,
      });

      expect(prisma.pointTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        }),
      );
    });

    it("should return empty list when no transactions exist", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      vi.mocked(prisma.pointTransaction.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.pointTransaction.count).mockResolvedValue(0);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.meta.total).toBe(0);
    });
  });
});
