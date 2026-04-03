"use client";

import { useState } from "react";
import {
  useAdminLoyaltyAccounts,
  useAdminToggleReward,
} from "@/hooks/useAdminLoyalty";
import { useAdminRewards } from "@/hooks/useAdminRewards";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Settings,
  Users,
  Gift,
  TicketCheck,
  BarChart3,
} from "lucide-react";
import { useParams } from "next/navigation";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { RewardModal } from "@/components/loyalty/RewardModal";
import { RedemptionsTab } from "@/components/admin/RedemptionsTab";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { AccountsTab } from "@/components/admin/loyalty/AccountsTab";

export default function AdminLoyaltyPage() {
  const t = useTranslations("loyalty.admin");
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: accountsSummary } = useAdminLoyaltyAccounts(1, 1);
  const { data: rewards, isLoading: rewardsLoading } = useAdminRewards();

  const toggleRewardMut = useAdminToggleReward();

  const [isNewRewardModalOpen, setIsNewRewardModalOpen] = useState(false);

  usePrivateHeader({
    title: t("title") || "Gestão de Fidelidade",
    icon: Settings,
    backHref: `/${locale}/dashboard`,
  });

  const handleOpenNewReward = () => {
    setIsNewRewardModalOpen(true);
  };

  const handleToggleReward = async (rewardId: string, newState: boolean) => {
    try {
      await toggleRewardMut.mutateAsync({ rewardId, active: newState });
    } catch (e) {
      console.error(e);
    }
  };

  if (rewardsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
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
              <div className="bg-card border border-border rounded-xl overflow-hidden p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Itens do Catálogo</h3>
                  <Button onClick={handleOpenNewReward}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {rewards?.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg gap-4",
                        r.active === false
                          ? "bg-muted/10 opacity-60"
                          : "bg-muted/20",
                      )}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {r.name}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {r.costInPoints} pts
                          </span>
                          {r.active === false && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                              Inativo
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {r.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Label className="text-muted-foreground">Ativo</Label>
                        <Switch
                          checked={r.active ?? true}
                          onCheckedChange={(checked) =>
                            handleToggleReward(r.id, checked)
                          }
                          disabled={toggleRewardMut.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

      <RewardModal
        open={isNewRewardModalOpen}
        onOpenChange={setIsNewRewardModalOpen}
      />
    </>
  );
}
