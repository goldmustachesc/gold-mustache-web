import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import { LoyaltyTier } from "@prisma/client";

/**
 * Calculates base points based on currency spent
 * Rules: X points per Y currency units
 */
export function calculateBasePoints(amountSpent: number): number {
  if (amountSpent <= 0) return 0;

  // e.g., if amount = 45, unit = 10 -> Math.floor(45/10) = 4
  // 4 * POINTS_PER_CURRENCY (10) = 40 points
  const blocks = Math.floor(amountSpent / LOYALTY_CONFIG.CURRENCY_UNIT);
  return blocks * LOYALTY_CONFIG.POINTS_PER_CURRENCY;
}

/**
 * Applies tier multiplier to base points
 */
export function applyTierBonus(basePoints: number, tier: LoyaltyTier): number {
  const bonusMultiplier = LOYALTY_CONFIG.TIERS[tier].bonus;
  return Math.floor(basePoints * (1 + bonusMultiplier));
}

/**
 * Full calculation for an appointment: base points + tier bonus
 */
export function calculateAppointmentPoints(
  amountSpent: number,
  tier: LoyaltyTier,
): { base: number; bonus: number; total: number } {
  const base = calculateBasePoints(amountSpent);
  const total = applyTierBonus(base, tier);

  return {
    base,
    bonus: total - base,
    total,
  };
}

/**
 * Determines correct Tier based on lifetime points
 */
export function determineTier(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= LOYALTY_CONFIG.TIERS.DIAMOND.min) {
    return LoyaltyTier.DIAMOND;
  }
  if (lifetimePoints >= LOYALTY_CONFIG.TIERS.GOLD.min) {
    return LoyaltyTier.GOLD;
  }
  if (lifetimePoints >= LOYALTY_CONFIG.TIERS.SILVER.min) {
    return LoyaltyTier.SILVER;
  }
  return LoyaltyTier.BRONZE;
}
