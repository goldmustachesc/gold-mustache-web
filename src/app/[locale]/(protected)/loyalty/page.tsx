"use client";

import { useLoyaltyAccount } from "@/hooks/useLoyalty";
import { Coins, TrendingUp, Gift, Loader2 } from "lucide-react";
import { LoyaltyCard } from "@/components/loyalty/LoyaltyCard";
import { useTranslations } from "next-intl";

const HOW_IT_WORKS = [
  { icon: Coins, titleKey: "earnPoints", descKey: "earnPointsDesc" },
  { icon: TrendingUp, titleKey: "levelUp", descKey: "levelUpDesc" },
  { icon: Gift, titleKey: "redeemRewards", descKey: "redeemRewardsDesc" },
] as const;

export default function LoyaltyDashboardPage() {
  const { data: account, isLoading, error } = useLoyaltyAccount();
  const t = useTranslations("loyalty.dashboard");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Não foi possível carregar os dados do programa de fidelidade.</p>
        <p className="text-sm mt-2">{error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <LoyaltyCard points={account.currentPoints} tier={account.tier} />

      <section className="space-y-6">
        <h2 className="text-xl font-playfair font-bold">{t("howItWorks")}</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.titleKey}
              className="group relative p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="mb-3 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {t(item.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(item.descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
