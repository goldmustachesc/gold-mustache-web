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
    reward: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

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

function createMockReward(overrides: Record<string, unknown> = {}) {
  return {
    id: "reward-1",
    name: "Corte Grátis",
    description: "Um corte de cabelo grátis",
    pointsCost: 500,
    type: "FREE_SERVICE",
    value: null,
    imageUrl: null,
    stock: 10,
    ...overrides,
  };
}

describe("/api/loyalty/rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFeatureEnabled.mockResolvedValue(true);
    authenticatedUser();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockGetUserRateLimitIdentifier.mockReturnValue("user-1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("should return 404 when loyaltyProgram flag is disabled (authenticated user)", async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 401 when user is not authenticated", async () => {
      unauthenticatedUser();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("should return 429 when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue({ success: false });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("RATE_LIMITED");
    });

    it("should return 200 with list of active rewards", async () => {
      vi.mocked(prisma.reward.findMany).mockResolvedValue([
        createMockReward({ imageUrl: "https://example.com/image.jpg" }),
      ] as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        id: "reward-1",
        name: "Corte Grátis",
      });
      expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "user-1");
    });

    it("should map pointsCost to costInPoints in response", async () => {
      vi.mocked(prisma.reward.findMany).mockResolvedValue([
        createMockReward({ name: "Barba Grátis", pointsCost: 300, stock: 5 }),
      ] as never);

      const response = await GET();
      const data = await response.json();

      expect(data.data[0].costInPoints).toBe(300);
      expect(data.data[0].pointsCost).toBeUndefined();
    });

    it("should return empty list when no active rewards exist", async () => {
      vi.mocked(prisma.reward.findMany).mockResolvedValue([] as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });

    it("should include private Cache-Control header on success", async () => {
      vi.mocked(prisma.reward.findMany).mockResolvedValue([] as never);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "private, max-age=60, stale-while-revalidate=300",
      );
    });

    it("should only return active rewards (not inactive ones)", async () => {
      vi.mocked(prisma.reward.findMany).mockResolvedValue([] as never);

      await GET();

      expect(prisma.reward.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
          orderBy: { pointsCost: "asc" },
        }),
      );
    });

    it("should not select serviceId, createdAt or updatedAt from database", async () => {
      vi.mocked(prisma.reward.findMany).mockResolvedValue([] as never);

      await GET();

      expect(prisma.reward.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({
            serviceId: true,
            createdAt: true,
            updatedAt: true,
          }),
        }),
      );
    });

    it("should return error response when database query fails", async () => {
      const _consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.mocked(prisma.reward.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
