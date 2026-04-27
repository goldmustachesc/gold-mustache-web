"use client";

import { useState } from "react";
import type { AdminLoyaltyAccountExtended } from "@/hooks/useAdminLoyalty";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AccountTransactions } from "@/components/admin/loyalty/AccountTransactions";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/loyalty/TierBadge";

export interface AccountCardProps {
  account: AdminLoyaltyAccountExtended;
  onAdjustPoints: () => void;
  className?: string;
}

export function AccountCard({
  account,
  onAdjustPoints,
  className,
}: AccountCardProps) {
  const t = useTranslations("loyalty.admin.accounts.card");
  const tAdmin = useTranslations("loyalty.admin");
  const locale = useLocale();
  const [transactionsOpen, setTransactionsOpen] = useState(false);

  const memberSinceLabel = (() => {
    try {
      return new Date(account.memberSince).toLocaleDateString(locale, {
        dateStyle: "medium",
      });
    } catch {
      return account.memberSince;
    }
  })();

  return (
    <article
      data-testid={`account-card-${account.id}`}
      className={cn(
        "bg-card border border-border rounded-xl p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">
            {account.fullName}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {account.email}
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-1 shrink-0">
          <span className="font-black font-mono tabular-nums text-primary text-lg">
            {account.points}
          </span>
          <TierBadge tier={account.tier} />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
        <div>
          <dt className="text-muted-foreground">{t("memberSince")}</dt>
          <dd className="font-medium text-foreground">{memberSinceLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("lifetimePoints")}</dt>
          <dd className="font-mono tabular-nums font-medium text-foreground">
            {account.lifetimePoints}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">{t("redemptions")}</dt>
          <dd className="font-mono tabular-nums font-medium text-foreground">
            {account.redemptionCount}
          </dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-border pt-3 space-y-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between px-2 h-auto py-2 text-sm font-medium"
          onClick={() => setTransactionsOpen((o) => !o)}
          aria-expanded={transactionsOpen}
        >
          <span>{t("transactionsToggle")}</span>
          {transactionsOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </Button>

        {transactionsOpen ? (
          <AccountTransactions accountId={account.id} enabled />
        ) : null}

        <Button variant="outline" onClick={onAdjustPoints} className="w-full">
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          {tAdmin("adjustPoints")}
        </Button>
      </div>
    </article>
  );
}
