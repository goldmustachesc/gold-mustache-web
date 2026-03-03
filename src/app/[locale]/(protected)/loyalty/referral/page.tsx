"use client";

import {
  useLoyaltyAccount,
  useValidateReferral,
  useApplyReferral,
} from "@/hooks/useLoyalty";
import {
  Loader2,
  Copy,
  CheckCircle2,
  Ticket,
  Users,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";

export default function LoyaltyReferralPage() {
  const { data: account, isLoading } = useLoyaltyAccount();
  const validateReferral = useValidateReferral();
  const applyReferral = useApplyReferral();
  const t = useTranslations("loyalty.referral");
  const [copied, setCopied] = useState(false);
  const [referralInput, setReferralInput] = useState("");

  const referralCode = account?.referralCode ?? "";
  const alreadyReferred = !!account?.referredById;

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard permission denied */
    }
  };

  const handleValidate = () => {
    const trimmed = referralInput.trim().toUpperCase();
    if (trimmed) {
      validateReferral.mutate(trimmed);
    }
  };

  const handleConfirmReferral = () => {
    const trimmed = referralInput.trim().toUpperCase();
    if (trimmed) {
      applyReferral.mutate(trimmed);
    }
  };

  const handleShareWhatsApp = () => {
    const message = t("shareMessage", { code: referralCode });
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
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
          {t("description", { points: LOYALTY_CONFIG.REFERRAL_BONUS })}
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

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button
            onClick={handleCopy}
            size="lg"
            variant={copied ? "secondary" : "default"}
            className={`w-full font-bold transition-all ${
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

          <Button
            onClick={handleShareWhatsApp}
            size="lg"
            variant="outline"
            className="w-full font-bold"
          >
            {t("shareWhatsApp")}
          </Button>
        </div>
      </div>

      <div className="bg-zinc-800/40 border border-zinc-700 p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-semibold">{t("referredByTitle")}</h3>

        {alreadyReferred ? (
          <p className="text-zinc-400 text-sm">{t("alreadyReferred")}</p>
        ) : (
          <>
            <div className="flex gap-3">
              <Input
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                placeholder={t("referredByPlaceholder")}
                aria-label={t("referredByPlaceholder")}
                maxLength={6}
                className="uppercase font-mono tracking-widest"
              />
              <Button
                onClick={handleValidate}
                disabled={!referralInput.trim() || validateReferral.isPending}
              >
                {validateReferral.isPending ? t("validating") : t("validate")}
              </Button>
            </div>

            {validateReferral.data && !applyReferral.isSuccess && (
              <div className="space-y-3">
                <p className="text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("referrerFound", {
                    name: validateReferral.data.referrerName,
                  })}
                </p>
                <Button
                  onClick={handleConfirmReferral}
                  disabled={applyReferral.isPending}
                  className="w-full font-bold"
                >
                  {applyReferral.isPending
                    ? t("applying")
                    : t("confirmReferral")}
                </Button>
              </div>
            )}

            {applyReferral.isSuccess && (
              <p className="text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("referralApplied")}
              </p>
            )}

            {validateReferral.isError && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {validateReferral.error?.message}
              </p>
            )}

            {applyReferral.isError && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {applyReferral.error?.message}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 bg-zinc-800/40 border border-zinc-700 p-4 rounded-xl">
        <Users className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-sm text-zinc-300" data-testid="referrals-count">
          {t("referralsCount", { count: account?.referralsCount ?? 0 })}
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
        <h4 className="font-semibold text-amber-500 mb-2">
          {t("howItWorksTitle")}
        </h4>
        <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-2">
          <li>{t("howItWorksStep1")}</li>
          <li>{t("howItWorksStep2")}</li>
          <li>{t("howItWorksStep3")}</li>
          <li>{t("howItWorksStep4")}</li>
        </ol>
      </div>
    </div>
  );
}
