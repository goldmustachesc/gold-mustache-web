"use client";

import { AccountsTab } from "@/components/admin/loyalty/AccountsTab";
import { CatalogTab } from "@/components/admin/loyalty/CatalogTab";
import { QuickStats } from "@/components/admin/loyalty/QuickStats";
import { RedemptionsTab } from "@/components/admin/RedemptionsTab";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Gift, Settings, TicketCheck, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function AdminLoyaltyPage() {
  const t = useTranslations("loyalty.admin");
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  usePrivateHeader({
    title: t("title") || "Gestão de Fidelidade",
    icon: Settings,
    backHref: `/${locale}/dashboard`,
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <QuickStats />
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="mb-6 flex h-12 w-full max-w-xl rounded-xl border border-border bg-muted p-1">
            <TabsTrigger
              value="accounts"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Users className="mr-2 h-4 w-4" />
              {t("users") || "Contas"}
            </TabsTrigger>
            <TabsTrigger
              value="catalog"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Gift className="mr-2 h-4 w-4" />
              {t("catalog") || "Catálogo"}
            </TabsTrigger>
            <TabsTrigger
              value="redemptions"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <TicketCheck className="mr-2 h-4 w-4" />
              {t("redemptions.tab") || "Resgates"}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
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
