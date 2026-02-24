"use client";

import { useLoyaltyAccount } from "@/hooks/useLoyalty";
import { Loader2, Copy, CheckCircle2, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoyaltyReferralPage() {
  const { data: account, isLoading } = useLoyaltyAccount();
  const t = useTranslations("loyalty.referral");
  const [copied, setCopied] = useState(false);

  // Fallback referral generation depending on loyalty backend config
  const referralCode = account?.id
    ? `GM-${account.id.substring(0, 6).toUpperCase()}`
    : "";

  const handleCopy = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <Ticket className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-3xl font-bold">{t("title")}</h2>
        <p className="text-zinc-400 text-lg">
          {t("description", { points: 150 })}
        </p>
      </div>

      <div className="bg-zinc-800/40 border border-zinc-700 p-8 rounded-2xl text-center space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {t("yourCode")}
        </h3>

        <div className="bg-zinc-950 py-4 px-6 rounded-xl border border-zinc-800 flex justify-center items-center gap-4 max-w-sm mx-auto">
          <span className="text-3xl font-mono font-black tracking-widest text-white">
            {referralCode}
          </span>
        </div>

        <Button
          onClick={handleCopy}
          size="lg"
          variant={copied ? "secondary" : "default"}
          className={`w-full max-w-sm mx-auto font-bold transition-all ${
            copied
              ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
              : ""
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {t("copied")}
            </>
          ) : (
            <>
              <Copy className="mr-2 h-5 w-5" />
              {t("copy")}
            </>
          )}
        </Button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
        <h4 className="font-semibold text-amber-500 mb-2">Como funciona?</h4>
        <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-2">
          <li>Copie seu código de indicação único.</li>
          <li>Envie para amigos que ainda não conhecem a Gold Mustache.</li>
          <li>Seu amigo insere o código no primeiro agendamento.</li>
          <li>
            Após a conclusão do serviço, ambos ganham pontos do programa
            fidelidade!
          </li>
        </ol>
      </div>
    </div>
  );
}
