"use client";

import { useAdminLoyaltyAccounts } from "@/hooks/useAdminLoyalty";
import { useAdminRewards } from "@/hooks/useAdminRewards";
import { Settings, Users, Gift, TicketCheck, BarChart3 } from "lucide-react";
import { useParams } from "next/navigation";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { RedemptionsTab } from "@/components/admin/RedemptionsTab";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { AccountsTab } from "@/components/admin/loyalty/AccountsTab";
import { CatalogTab } from "@/components/admin/loyalty/CatalogTab";

export default function AdminLoyaltyPage() {
  const t = useTranslations("loyalty.admin");
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: accountsSummary } = useAdminLoyaltyAccounts(1, 1);
  const { data: rewards } = useAdminRewards();

  usePrivateHeader({
    title: t("title") || "Gestão de Fidelidade",
    icon: Settings,
    backHref: `/${locale}/dashboard`,
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <p className="text-sm text-muted-foreground">
          {accountsSummary?.meta.total ?? 0} {t("accountsCount")} •{" "}
          {rewards?.length ?? 0} {t("rewardsCount")}
        </p>
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="mb-6 bg-muted border border-border flex h-12 w-full max-w-xl rounded-xl p-1">
            <TabsTrigger
              value="accounts"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("users") || "Contas"}
            </TabsTrigger>
            <TabsTrigger
              value="catalog"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Gift className="h-4 w-4 mr-2" />
              {t("catalog") || "Catálogo"}
            </TabsTrigger>
            <TabsTrigger
              value="redemptions"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <TicketCheck className="h-4 w-4 mr-2" />
              {t("redemptions.tab") || "Resgates"}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("reports.tab") || "Relatórios"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-6 md:space-y-8">
            <AccountsTab />
          </TabsContent>

          <TabsContent value="catalog" className="space-y-6">
            <CatalogTab />
          </TabsContent>

          <TabsContent value="redemptions">
            <RedemptionsTab />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
