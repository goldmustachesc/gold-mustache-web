"use client";

import {
  useAdminExpiringPoints,
  useAdminLoyaltyReports,
} from "@/hooks/useAdminLoyalty";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  AlertTriangle,
  Coins,
  Loader2,
  TicketCheck,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function QuickStats() {
  const t = useTranslations("loyalty.admin.quickStats");
  const locale = useLocale();
  const { data: reports, isLoading: reportsLoading } = useAdminLoyaltyReports();
  const { data: expiring, isLoading: expiringLoading } =
    useAdminExpiringPoints();

  const loading =
    reportsLoading ||
    expiringLoading ||
    reports === undefined ||
    expiring === undefined;

  if (loading) {
    return (
      <div
        data-testid="quick-stats-loading"
        className="flex justify-center py-8"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const expiringCount = expiring.length;
  const pendingRedemptions = reports.redemptionsByStatus.PENDING ?? 0;

  const expiringCard = (
    <KpiCard
      testId="kpi-quick-expiring-points"
      icon={<AlertTriangle className="h-5 w-5 text-primary" />}
      label={t("expiringPoints")}
      value={expiringCount}
      locale={locale}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        testId="kpi-quick-total-accounts"
        icon={<Users className="h-5 w-5 text-primary" />}
        label={t("totalAccounts")}
        value={reports.totalAccounts}
        locale={locale}
      />
      <KpiCard
        testId="kpi-quick-points-circulation"
        icon={<Coins className="h-5 w-5 text-primary" />}
        label={t("pointsInCirculation")}
        value={reports.totalPointsInCirculation}
        locale={locale}
      />
      <KpiCard
        testId="kpi-quick-pending-redemptions"
        icon={<TicketCheck className="h-5 w-5 text-primary" />}
        label={t("pendingRedemptions")}
        value={pendingRedemptions}
        locale={locale}
      />
      {expiringCount > 0 ? (
        <div
          data-testid="quick-stats-expiring-highlight"
          className="rounded-xl ring-2 ring-amber-500/60"
        >
          {expiringCard}
        </div>
      ) : (
        expiringCard
      )}
    </div>
  );
}
