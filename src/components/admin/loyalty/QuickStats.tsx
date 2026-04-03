"use client";

import {
  useAdminExpiringPoints,
  useAdminLoyaltyReports,
} from "@/hooks/useAdminLoyalty";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  AlertCircle,
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
  const {
    data: reports,
    isLoading: reportsLoading,
    isError: reportsError,
  } = useAdminLoyaltyReports();
  const {
    data: expiring,
    isLoading: expiringLoading,
    isError: expiringError,
  } = useAdminExpiringPoints();

  const hasError = reportsError || expiringError;
  const loading =
    !hasError &&
    (reportsLoading ||
      expiringLoading ||
      reports === undefined ||
      expiring === undefined);

  if (hasError) {
    return (
      <div
        data-testid="quick-stats-error"
        role="alert"
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center"
      >
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
        <p className="text-sm text-destructive">{t("loadError")}</p>
      </div>
    );
  }

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

  const expiringCount = expiring?.length ?? 0;
  const pendingRedemptions = reports?.redemptionsByStatus.PENDING ?? 0;

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
        value={reports?.totalAccounts ?? 0}
        locale={locale}
      />
      <KpiCard
        testId="kpi-quick-points-circulation"
        icon={<Coins className="h-5 w-5 text-primary" />}
        label={t("pointsInCirculation")}
        value={reports?.totalPointsInCirculation ?? 0}
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
