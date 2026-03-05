import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateBasePoints,
  applyTierBonus,
  determineTier,
  calculateAppointmentPoints,
} from "../points.calculator";
import { LoyaltyTier } from "@prisma/client";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";

describe("services/loyalty/points.calculator", () => {
  describe("calculateBasePoints", () => {
    it("should calculate correct base points for exact amount", () => {
      expect(calculateBasePoints(100)).toBe(100);
      expect(calculateBasePoints(50)).toBe(50);
    });

    it("should return 0 for zero amount", () => {
      expect(calculateBasePoints(0)).toBe(0);
    });

    it("should return 0 for negative values", () => {
      expect(calculateBasePoints(-50)).toBe(0);
    });

    it("should floor floating numbers", () => {
      expect(calculateBasePoints(99.9)).toBe(90);
      expect(calculateBasePoints(0.5)).toBe(0);
    });
  });

  describe("applyTierBonus", () => {
    it("should apply BRONZE bonus correctly", () => {
      expect(applyTierBonus(100, LoyaltyTier.BRONZE)).toBe(100);
    });

    it("should apply SILVER bonus correctly", () => {
      expect(applyTierBonus(100, LoyaltyTier.SILVER)).toBe(110);
      expect(applyTierBonus(105, LoyaltyTier.SILVER)).toBe(115);
    });

    it("should apply GOLD bonus correctly", () => {
      expect(applyTierBonus(100, LoyaltyTier.GOLD)).toBe(120);
    });

    it("should apply DIAMOND bonus correctly", () => {
      expect(applyTierBonus(100, LoyaltyTier.DIAMOND)).toBe(130);
    });
  });

  describe("determineTier", () => {
    it("should return BRONZE for lifetime points under silver threshold", () => {
      expect(determineTier(0)).toBe(LoyaltyTier.BRONZE);
      expect(determineTier(499)).toBe(LoyaltyTier.BRONZE);
    });

    it("should return SILVER for lifetime points over silver but under gold", () => {
      expect(determineTier(500)).toBe(LoyaltyTier.SILVER);
      expect(determineTier(1499)).toBe(LoyaltyTier.SILVER);
    });

    it("should return GOLD for lifetime points over gold but under diamond", () => {
      expect(determineTier(1500)).toBe(LoyaltyTier.GOLD);
      expect(determineTier(2999)).toBe(LoyaltyTier.GOLD);
    });

    it("should return DIAMOND for lifetime points over diamond threshold", () => {
      expect(determineTier(3000)).toBe(LoyaltyTier.DIAMOND);
      expect(determineTier(50000)).toBe(LoyaltyTier.DIAMOND);
    });
  });

  describe("calculateAppointmentPoints", () => {
    it("should calculate full appointment points based on BRONZE tier", () => {
      const result = calculateAppointmentPoints(100, LoyaltyTier.BRONZE);
      expect(result).toEqual({ base: 100, bonus: 0, total: 100 });
    });

    it("should calculate full appointment points based on SILVER tier", () => {
      const result = calculateAppointmentPoints(100, LoyaltyTier.SILVER);
      // 100 base, 110 total -> 10 bonus
      expect(result).toEqual({ base: 100, bonus: 10, total: 110 });
    });

    it("should handle floating prices during integration", () => {
      const result = calculateAppointmentPoints(150.75, LoyaltyTier.GOLD);
      // 150 base * 1.20 = 180 total
      expect(result).toEqual({ base: 150, bonus: 30, total: 180 });
    });
  });

  describe("property-based", () => {
    it("determineTier should always return a valid tier for any non-negative points", () => {
      fc.assert(
        fc.property(fc.nat(100000), (points) => {
          const tier = determineTier(points);
          expect(Object.values(LoyaltyTier)).toContain(tier);
        }),
      );
    });

    it("determineTier should be monotonically non-decreasing with points", () => {
      const tierOrder = [
        LoyaltyTier.BRONZE,
        LoyaltyTier.SILVER,
        LoyaltyTier.GOLD,
        LoyaltyTier.DIAMOND,
      ];
      fc.assert(
        fc.property(fc.nat(100000), fc.nat(100000), (a, b) => {
          const low = Math.min(a, b);
          const high = Math.max(a, b);
          const lowTier = tierOrder.indexOf(determineTier(low));
          const highTier = tierOrder.indexOf(determineTier(high));
          expect(highTier).toBeGreaterThanOrEqual(lowTier);
        }),
      );
    });

    it("applyTierBonus should always return >= base points", () => {
      const tiers = Object.values(LoyaltyTier);
      fc.assert(
        fc.property(fc.nat(10000), fc.constantFrom(...tiers), (base, tier) => {
          expect(applyTierBonus(base, tier)).toBeGreaterThanOrEqual(base);
        }),
      );
    });

    it("calculateBasePoints should never exceed amount spent", () => {
      fc.assert(
        fc.property(fc.nat(100000), (amount) => {
          expect(calculateBasePoints(amount)).toBeLessThanOrEqual(
            amount * LOYALTY_CONFIG.POINTS_PER_CURRENCY,
          );
        }),
      );
    });
  });
});
