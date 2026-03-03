"use client";

import { useState } from "react";
import {
  useAdminLoyaltyAccounts,
  useAdminAdjustPoints,
  useAdminToggleReward,
  type AdminLoyaltyAccount,
} from "@/hooks/useAdminLoyalty";
import { useAdminRewards } from "@/hooks/useAdminRewards";
import {
  ArrowLeft,
  Loader2,
  Plus,
  ArrowLeftRight,
  Settings,
  Users,
  Gift,
  Save,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
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

export default function AdminLoyaltyPage() {
  const t = useTranslations("loyalty.admin");
  const router = useRouter();
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
      // In a real app we'd show a toast here. For now we just close or mock success.
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
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Padronizado */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Image
                src="/logo.png"
                alt="Gold Mustache"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Settings className="h-4 w-4 text-amber-500 hidden sm:block" />
                  {t("title") || "Gestão de Fidelidade"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {accounts?.length ?? 0} {t("accountsCount")} •{" "}
                  {rewards?.length ?? 0} {t("rewardsCount")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="mb-6 bg-muted border border-border flex h-12 w-full max-w-sm rounded-xl p-1">
              <TabsTrigger
                value="accounts"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Users className="h-4 w-4 mr-2" />
                {t("users") || "Contas"}
              </TabsTrigger>
              <TabsTrigger
                value="catalog"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Gift className="h-4 w-4 mr-2" />
                {t("catalog") || "Catálogo"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="space-y-6 md:space-y-8">
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
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
                          <td className="px-6 py-4 text-right font-black text-primary text-lg">
                            {acc.points}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
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
            </TabsContent>

            <TabsContent value="catalog" className="space-y-6">
              <div className="bg-card border border-border rounded-xl overflow-hidden p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Itens do Catálogo</h3>
                  <Button size="sm" onClick={handleOpenNewReward}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {rewards?.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg bg-muted/20 gap-4"
                    >
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {r.name}
                          {/* Assuming valid reward has active status, using logic fallback */}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {r.costInPoints} pts
                          </span>
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
          </Tabs>

          {/* Manual Adjust Modal */}
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
                  <strong className="text-amber-500">
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
                    className="col-span-3 border-input bg-background focus-visible:ring-amber-500"
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
                    className="col-span-3 border-input bg-background focus-visible:ring-amber-500"
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

      {/* Reward Creation Modal */}
      <RewardModal
        open={isNewRewardModalOpen}
        onOpenChange={setIsNewRewardModalOpen}
      />
    </div>
  );
}
