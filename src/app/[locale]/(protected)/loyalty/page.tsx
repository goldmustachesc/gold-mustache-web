"use client";

import { useLoyaltyAccount } from "@/hooks/useLoyalty";
import { Loader2 } from "lucide-react";
import { LoyaltyCard } from "@/components/loyalty/LoyaltyCard";
import { useTranslations } from "next-intl";

export default function LoyaltyDashboardPage() {
  const { data: account, isLoading, error } = useLoyaltyAccount();
  const t = useTranslations("loyalty.dashboard");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p>Não foi possível carregar os dados do programa de fidelidade.</p>
        <p className="text-sm mt-2">{error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <LoyaltyCard points={account.currentPoints} tier={account.tier} />

      {/* Como funciona ou Benefícios (Estatico por enquanto) */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("howItWorks")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/20">
            <h3 className="font-semibold text-amber-500 mb-2">
              Acumule Pontos
            </h3>
            <p className="text-sm text-zinc-400">
              Ganhe pontos a cada agendamento realizado e concluído.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/20">
            <h3 className="font-semibold text-amber-500 mb-2">Suba de Nível</h3>
            <p className="text-sm text-zinc-400">
              Quanto mais serviços, melhor seu nível e suas vantagens.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/20">
            <h3 className="font-semibold text-amber-500 mb-2">
              Troque por Prêmios
            </h3>
            <p className="text-sm text-zinc-400">
              Use seus pontos na aba Recompensas para resgatar serviços e
              descontos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
