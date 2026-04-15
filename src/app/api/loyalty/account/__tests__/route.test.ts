import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockGetUser = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetUserRateLimitIdentifier = vi.fn();
const mockIsFeatureEnabled = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/services/feature-flags", () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    loyaltyAccount: { count: vi.fn() },
  },
}));

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    getOrCreateAccount: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
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

describe("/api/loyalty/account", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    mockIsFeatureEnabled.mockResolvedValue(true);
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation((userId: unknown) => {
      return `auth:${String(userId)}`;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("should return 404 when loyaltyProgram flag is disabled (authenticated user)", async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);

      const request = new Request("http://localhost:3001/api/loyalty/account");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 429 when rate limited", async () => {
      authenticatedUser();
      mockCheckRateLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60_000,
      });

      const request = new Request("http://localhost:3001/api/loyalty/account");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("RATE_LIMITED");
    });

    it("should return 401 when not authenticated", async () => {
      unauthenticatedUser();

      const request = new Request("http://localhost:3001/api/loyalty/account");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("should return 404 when profile not found", async () => {
      authenticatedUser();
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

      const request = new Request("http://localhost:3001/api/loyalty/account");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 200 with account data including referralsCount", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();
      vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(3);

      const request = new Request("http://localhost:3001/api/loyalty/account");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toMatchObject({
        id: "acc-1",
        currentPoints: 500,
        lifetimePoints: 1000,
        tier: "BRONZE",
        referralCode: "ABCDEF",
        referredById: null,
        referralsCount: 3,
      });
      expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "auth:user-1");
    });

    it("should call LoyaltyService.getOrCreateAccount with profile ID", async () => {
      authenticatedUser();
      mockProfile("profile-42");
      mockAccount();
      vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(0);

      const request = new Request("http://localhost:3001/api/loyalty/account");
      await GET();

      expect(LoyaltyService.getOrCreateAccount).toHaveBeenCalledWith(
        "profile-42",
      );
    });
  });
});
