import type { LoyaltyTier } from "@/components/loyalty/TierBadge";

export type RedemptionStatus = "PENDING" | "USED" | "EXPIRED";

export interface LoyaltyReportsData {
  totalAccounts: number;
  tierDistribution: Partial<Record<LoyaltyTier, number>>;
  totalPointsInCirculation: number;
  totalPointsRedeemed: number;
  totalRedemptions: number;
  redemptionsByStatus: Record<RedemptionStatus, number>;
  topRewards: Array<{ name: string; count: number }>;
  recentActivity: {
    pointsEarnedLast30Days: number;
    redemptionsLast30Days: number;
    newAccountsLast30Days: number;
  };
}
