"use client";

import {
  useLoyaltyAccount,
  useRewards,
  useRedeemReward,
  type RedemptionResult,
} from "@/hooks/useLoyalty";
import { Loader2, AlertTriangle, Copy, Check } from "lucide-react";
import { RewardCard } from "@/components/loyalty/RewardCard";
import { ApiError } from "@/lib/api/client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/utils/datetime";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export default function LoyaltyRewardsPage() {
  const { data: account, isLoading: accountLoading } = useLoyaltyAccount();
  const {
    data: rewards,
    isLoading: rewardsLoading,
    isError: rewardsError,
    refetch: refetchRewards,
  } = useRewards();
  const redeemReward = useRedeemReward();
  const t = useTranslations("loyalty.rewards");

  const [successResult, setSuccessResult] = useState<RedemptionResult | null>(
    null,
  );
  const { copied: codeCopied, copy: copyCode } = useCopyToClipboard();

  const isLoading = accountLoading || rewardsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const handleRedeem = async (rewardId: string) => {
    try {
      const result = await redeemReward.mutateAsync(rewardId);
      setSuccessResult(result);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : t("redeemError");
      toast.error(message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-zinc-400">{t("description")}</p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <span className="font-semibold text-zinc-300">
          {t("currentBalance")}
        </span>
        <span className="text-2xl font-black text-primary">
          {account?.currentPoints ?? 0} pts
        </span>
      </div>

      {rewardsError ? (
        <div className="col-span-full text-center py-12 border border-dashed border-zinc-700 rounded-xl space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <p className="text-zinc-400">{t("errorLoading")}</p>
          <Button variant="outline" onClick={() => refetchRewards()}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rewards?.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              userPoints={account?.currentPoints ?? 0}
              onRedeem={handleRedeem}
              isRedeeming={redeemReward.isPending}
            />
          ))}
          {(!rewards || rewards.length === 0) && (
            <div className="col-span-full text-center py-12 text-zinc-500 border border-dashed border-zinc-700 rounded-xl">
              {t("emptyState")}
            </div>
          )}
        </div>
      )}

      <Dialog
        open={!!successResult}
        onOpenChange={(open) => !open && setSuccessResult(null)}
      >
        <DialogContent className="sm:max-w-md text-center bg-zinc-900 border-zinc-800">
          <DialogHeader className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <DialogTitle className="text-2xl text-emerald-500">
              {t("successRedeem")}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {t("redeemCodeLabel")}
            </DialogDescription>
          </DialogHeader>

          {successResult?.reward?.name && (
            <p
              className="text-lg font-semibold text-zinc-200"
              data-testid="success-reward-name"
            >
              {successResult.reward.name}
            </p>
          )}

          <div className="bg-zinc-800 p-6 rounded-lg my-4 flex items-center justify-center gap-3">
            <p className="text-3xl font-mono font-black tracking-widest text-primary">
              {successResult?.code}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => successResult && copyCode(successResult.code)}
              aria-label={t("copyCode")}
              className="h-9 w-9 text-zinc-400 hover:text-white shrink-0"
            >
              {codeCopied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>

          {successResult?.expiresAt && (
            <p
              className="text-sm text-zinc-400"
              data-testid="success-expiry-date"
            >
              {t("expiresAt")}: {formatDateShort(successResult.expiresAt)}
            </p>
          )}

          <p className="text-sm text-zinc-400 mb-4 px-4">
            {t("redeemCodeInstruction")}
          </p>

          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setSuccessResult(null)}
              className="w-full font-bold"
            >
              {t("understood")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
