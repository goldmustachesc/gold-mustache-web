import { requireAdmin } from "@/lib/auth/requireAdmin";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess } from "@/lib/api/response";
import type { LoyaltyReportsData } from "@/types/loyalty";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";

export async function GET(_request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalAccounts,
      tierGroups,
      pointsAggregate,
      redeemedAggregate,
      totalRedemptions,
      usedRedemptions,
      pendingRedemptions,
      expiredRedemptions,
      topRewardGroups,
      pointsEarnedAggregate,
      redemptionsLast30Days,
      newAccountsLast30Days,
    ] = await Promise.all([
      prisma.loyaltyAccount.count(),
      prisma.loyaltyAccount.groupBy({
        by: ["tier"],
        _count: { _all: true },
      }),
      prisma.loyaltyAccount.aggregate({
        _sum: { currentPoints: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { type: "REDEEMED" },
        _sum: { points: true },
      }),
      prisma.redemption.count(),
      prisma.redemption.count({ where: { usedAt: { not: null } } }),
      prisma.redemption.count({
        where: { usedAt: null, expiresAt: { gte: now } },
      }),
      prisma.redemption.count({
        where: { usedAt: null, expiresAt: { lt: now } },
      }),
      prisma.redemption.groupBy({
        by: ["rewardId"],
        _count: { _all: true },
        orderBy: { _count: { rewardId: "desc" } },
        take: 10,
      }),
      prisma.pointTransaction.aggregate({
        where: {
          type: { notIn: ["REDEEMED", "EXPIRED"] },
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { points: true },
      }),
      prisma.redemption.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.loyaltyAccount.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const VALID_TIERS = new Set<string>([
      "BRONZE",
      "SILVER",
      "GOLD",
      "DIAMOND",
    ]);
    const tierDistribution: Partial<Record<LoyaltyTier, number>> = {};
    for (const group of tierGroups) {
      if (VALID_TIERS.has(group.tier)) {
        tierDistribution[group.tier as LoyaltyTier] = group._count._all;
      }
    }

    const rewardIds = topRewardGroups.map((g) => g.rewardId);
    const rewards =
      rewardIds.length > 0
        ? await prisma.reward.findMany({
            where: { id: { in: rewardIds } },
            select: { id: true, name: true },
          })
        : [];

    const rewardNameMap = new Map(rewards.map((r) => [r.id, r.name]));
    const topRewards = topRewardGroups.map((g) => ({
      name: rewardNameMap.get(g.rewardId) ?? "Unknown",
      count: g._count._all,
    }));

    const data: LoyaltyReportsData = {
      totalAccounts,
      tierDistribution,
      totalPointsInCirculation: pointsAggregate._sum.currentPoints ?? 0,
      totalPointsRedeemed: Math.abs(redeemedAggregate._sum.points ?? 0),
      totalRedemptions,
      redemptionsByStatus: {
        PENDING: pendingRedemptions,
        USED: usedRedemptions,
        EXPIRED: expiredRedemptions,
      },
      topRewards,
      recentActivity: {
        pointsEarnedLast30Days: pointsEarnedAggregate._sum.points ?? 0,
        redemptionsLast30Days,
        newAccountsLast30Days,
      },
    };

    return apiSuccess(data);
  } catch (error) {
    return handlePrismaError(error, "Erro ao gerar relatórios de fidelidade");
  }
}
