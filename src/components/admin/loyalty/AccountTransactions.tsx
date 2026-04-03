"use client";

import { useAdminAccountTransactions } from "@/hooks/useAdminLoyalty";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export interface AccountTransactionsProps {
  accountId: string;
  /** Quando falso, a query não roda (ex.: card recolhido). */
  enabled?: boolean;
  /** Quantidade máxima de linhas na lista compacta. */
  limit?: number;
  className?: string;
}

export function AccountTransactions({
  accountId,
  enabled = true,
  limit = 10,
  className,
}: AccountTransactionsProps) {
  const t = useTranslations("loyalty.admin.accounts.transactions");
  const tTypes = useTranslations("loyalty.history.types");
  const locale = useLocale();

  const { data, isLoading, isError } = useAdminAccountTransactions(
    accountId,
    1,
    limit,
    enabled,
  );

  if (!enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground",
          className,
        )}
        data-testid="account-transactions-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
          className,
        )}
        data-testid="account-transactions-error"
      >
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        {t("loadError")}
      </div>
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <p
        className={cn("py-3 text-sm text-muted-foreground", className)}
        data-testid="account-transactions-empty"
      >
        {t("empty")}
      </p>
    );
  }

  const knownTypes = ["EARNED", "REDEEMED", "EXPIRED", "ADJUSTED"] as const;

  const labelForType = (type: string) => {
    if ((knownTypes as readonly string[]).includes(type)) {
      return tTypes(type as (typeof knownTypes)[number]);
    }
    return type;
  };

  return (
    <ul
      className={cn(
        "divide-y divide-border rounded-lg border border-border",
        className,
      )}
      data-testid="account-transactions-list"
    >
      {rows.map((tx) => {
        const typeLabel = labelForType(tx.type);

        const dateLabel = new Date(tx.createdAt).toLocaleString(locale, {
          dateStyle: "short",
          timeStyle: "short",
        });

        const pointsPositive = tx.points >= 0;

        return (
          <li
            key={tx.id}
            className="flex flex-col gap-1 px-3 py-2.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground">
                {tx.description?.trim() || typeLabel}
              </div>
              <div className="text-xs text-muted-foreground">
                {typeLabel} · {dateLabel}
              </div>
            </div>
            <div
              className={cn(
                "shrink-0 font-mono tabular-nums font-semibold sm:text-right",
                pointsPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {pointsPositive ? "+" : ""}
              {tx.points}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
