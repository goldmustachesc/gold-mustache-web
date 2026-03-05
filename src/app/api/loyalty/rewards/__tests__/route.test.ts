import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reward: { findMany: vi.fn() },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function createMockReward(overrides: Record<string, unknown> = {}) {
  return {
    id: "reward-1",
    name: "Corte Grátis",
    description: "Um corte de cabelo grátis",
    pointsCost: 500,
    type: "FREE_SERVICE",
    value: null,
    serviceId: null,
    imageUrl: null,
    active: true,
    stock: 10,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("/api/loyalty/rewards", () => {
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
        active: true,
      });
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
  });
});
