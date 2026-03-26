"use client";

import { useState } from "react";
import {
  useAdminLoyaltyAccounts,
  useAdminAdjustPoints,
  useAdminToggleReward,
  type AdminLoyaltyAccount,
} from "@/hooks/useAdminLoyalty";
import { useAdminRewards } from "@/hooks/useAdminRewards";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Plus,
  ArrowLeftRight,
  Settings,
  Users,
  Gift,
  Save,
  TicketCheck,
  BarChart3,
} from "lucide-react";
import { useParams } from "next/navigation";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TierBadge } from "@/components/loyalty/TierBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { RewardModal } from "@/components/loyalty/RewardModal";
import { RedemptionsTab } from "@/components/admin/RedemptionsTab";
import { ReportsTab } from "@/components/admin/ReportsTab";

export default function AdminLoyaltyPage() {
  const t = useTranslations("loyalty.admin");
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: accounts, isLoading: accountsLoading } =
    useAdminLoyaltyAccounts();
  const { data: rewards, isLoading: rewardsLoading } = useAdminRewards();

  const adjustPointsMut = useAdminAdjustPoints();
  const toggleRewardMut = useAdminToggleReward();

  const [selectedAccount, setSelectedAccount] =
    useState<AdminLoyaltyAccount | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [isNewRewardModalOpen, setIsNewRewardModalOpen] = useState(false);

  usePrivateHeader({
    title: t("title") || "Gestão de Fidelidade",
    icon: Settings,
    backHref: `/${locale}/dashboard`,
  });

  const handleOpenAdjust = (acc: AdminLoyaltyAccount) => {
    setSelectedAccount(acc);
    setAdjustAmount("");
    setAdjustReason("");
  };

  const handleOpenNewReward = () => {
    setIsNewRewardModalOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedAccount || !adjustAmount) return;
    try {
      await adjustPointsMut.mutateAsync({
        accountId: selectedAccount.id,
        points: parseInt(adjustAmount, 10),
        reason: adjustReason || "Ajuste manual admin",
      });
      setSelectedAccount(null);
    } catch (e) {
      console.error(e);
      setSelectedAccount(null);
    }
  };

  const handleToggleReward = async (rewardId: string, newState: boolean) => {
    try {
      await toggleRewardMut.mutateAsync({ rewardId, active: newState });
    } catch (e) {
      console.error(e);
    }
  };

  if (accountsLoading || rewardsLoading) {
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
            {accounts?.length ?? 0} {t("accountsCount")} •{" "}
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
              <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Nível</th>
                        <th className="px-6 py-4 text-right">Pontos</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts?.map((acc) => (
                        <tr
                          key={acc.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">
                              {acc.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {acc.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <TierBadge tier={acc.tier} />
                          </td>
                          <td className="px-6 py-4 text-right font-black font-mono tabular-nums text-primary text-lg">
                            {acc.points}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              onClick={() => handleOpenAdjust(acc)}
                            >
                              <ArrowLeftRight className="h-4 w-4 mr-2" />
                              {t("adjustPoints") || "Ajustar"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {(!accounts || accounts.length === 0) && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-12 text-center text-muted-foreground"
                          >
                            Nenhuma conta encontrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:hidden space-y-3">
                {accounts?.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate">
                          {acc.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {acc.email}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="font-black font-mono tabular-nums text-primary text-lg">
                          {acc.points}
                        </div>
                        <TierBadge tier={acc.tier} />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenAdjust(acc)}
                        className="w-full"
                      >
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        {t("adjustPoints") || "Ajustar"}
                      </Button>
                    </div>
                  </div>
                ))}
                {(!accounts || accounts.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma conta encontrada.
                  </div>
                )}
              </div>
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

          <Dialog
            open={!!selectedAccount}
            onOpenChange={(open) => !open && setSelectedAccount(null)}
          >
            <DialogContent className="sm:max-w-md bg-background border-border">
              <DialogHeader>
                <DialogTitle>
                  {t("adjustPoints") || "Ajuste de Pontos"}
                </DialogTitle>
                <DialogDescription>
                  Modificando saldo de{" "}
                  <strong className="text-foreground">
                    {selectedAccount?.fullName}
                  </strong>{" "}
                  (Atual:{" "}
                  <strong className="text-primary font-mono tabular-nums">
                    {selectedAccount?.points} pts
                  </strong>
                  ).
                  <br />
                  Use valores positivos para adicionar e negativos para remover
                  pontos.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="points" className="text-right">
                    Pontos
                  </Label>
                  <Input
                    id="points"
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="+100 ou -50"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason" className="text-right">
                    {t("reason") || "Motivo"}
                  </Label>
                  <Input
                    id="reason"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Ex: Correção, Bônus extra..."
                    className="col-span-3"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedAccount(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAdjustment}
                  disabled={!adjustAmount || adjustPointsMut.isPending}
                >
                  {adjustPointsMut.isPending ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Salvar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <RewardModal
        open={isNewRewardModalOpen}
        onOpenChange={setIsNewRewardModalOpen}
      />
    </>
  );
}
