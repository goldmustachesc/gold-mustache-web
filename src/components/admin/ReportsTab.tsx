"use client";

import { useAdminLoyaltyReports } from "@/hooks/useAdminLoyalty";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  Loader2,
  Users,
  Coins,
  TicketCheck,
  TrendingUp,
  Trophy,
  Activity,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";

const TIER_COLORS: Partial<Record<LoyaltyTier, string>> = {
  BRONZE: "bg-orange-700",
  SILVER: "bg-gray-400",
  GOLD: "bg-primary",
  DIAMOND: "bg-cyan-400",
};

export function ReportsTab() {
  const t = useTranslations("loyalty.admin");
  const locale = useLocale();
  const { data, isLoading } = useAdminLoyaltyReports();

  if (isLoading || !data) {
    return (
      <div data-testid="reports-loading" className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const redemptionRate =
    data.totalAccounts > 0
      ? (
          (data.recentActivity.redemptionsLast30Days / data.totalAccounts) *
          100
        ).toFixed(1)
      : "0";

  const tierValues = Object.values(data.tierDistribution).filter(
    (v): v is number => v !== undefined,
  );
  const maxTierCount = Math.max(...tierValues, 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          testId="kpi-total-accounts"
          icon={<Users className="h-5 w-5 text-primary" />}
          label={t("reports.totalAccounts")}
          value={data.totalAccounts}
          locale={locale}
        />
        <KpiCard
          testId="kpi-points-in-circulation"
          icon={<Coins className="h-5 w-5 text-primary" />}
          label={t("reports.pointsInCirculation")}
          value={data.totalPointsInCirculation}
          locale={locale}
        />
        <KpiCard
          testId="kpi-redemptions-month"
          icon={<TicketCheck className="h-5 w-5 text-primary" />}
          label={t("reports.redemptionsMonth")}
          value={data.recentActivity.redemptionsLast30Days}
          locale={locale}
        />
        <KpiCard
          testId="kpi-redemption-rate"
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          label={t("reports.redemptionRate")}
          value={`${redemptionRate}%`}
          locale={locale}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("reports.tierDistribution")}
          </h3>
          {Object.keys(data.tierDistribution).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("reports.noData")}
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.tierDistribution).map(([tier, count]) => {
                const tierCount = count ?? 0;
                return (
                  <div key={tier} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{tier}</span>
                      <span className="text-muted-foreground">{tierCount}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        data-testid={`tier-bar-${tier}`}
                        className={`h-full rounded-full transition-all ${TIER_COLORS[tier as LoyaltyTier] ?? "bg-primary"}`}
                        style={{
                          width: `${(tierCount / maxTierCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            {t("reports.topRewards")}
          </h3>
          {data.topRewards.length === 0 ? (
            <p
              data-testid="reports-no-rewards"
              className="text-sm text-muted-foreground"
            >
              {t("reports.noRewards")}
            </p>
          ) : (
            <div className="space-y-2">
              {data.topRewards.map((reward, idx) => (
                <div
                  key={reward.name}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{reward.name}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {reward.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {t("reports.recentActivity")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p
              data-testid="activity-points-earned"
              className="text-2xl font-bold text-primary"
            >
              {data.recentActivity.pointsEarnedLast30Days.toLocaleString(
                locale,
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("reports.pointsEarned30d")}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p
              data-testid="activity-redemptions"
              className="text-2xl font-bold text-primary"
            >
              {data.recentActivity.redemptionsLast30Days.toLocaleString(locale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("reports.redemptions30d")}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p
              data-testid="activity-new-accounts"
              className="text-2xl font-bold text-primary"
            >
              {data.recentActivity.newAccountsLast30Days.toLocaleString(locale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("reports.newAccounts30d")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
