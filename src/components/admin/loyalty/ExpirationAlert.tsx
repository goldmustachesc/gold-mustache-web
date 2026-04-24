"use client";

import { useAdminExpiringPoints } from "@/hooks/useAdminLoyalty";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ExpirationAlertProps {
  className?: string;
}

/**
 * Faixa de aviso quando o endpoint de pontos prestes a expirar retorna itens.
 * Usamos o tamanho da lista retornada pelo hook como contagem exibida.
 */
export function ExpirationAlert({ className }: ExpirationAlertProps) {
  const t = useTranslations("loyalty.admin.accounts.expirationAlert");
  const { data, isLoading, isError } = useAdminExpiringPoints();

  if (isLoading || isError || data === undefined) {
    return null;
  }

  const expiringCount = data.length;
  if (expiringCount <= 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      data-testid="expiration-alert"
      className={cn(
        "flex gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-50",
        className,
      )}
    >
      <AlertTriangle
        className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300"
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold leading-tight">{t("title")}</p>
        <p className="text-sm leading-snug text-amber-900/90 dark:text-amber-50/90">
          {t("description", { count: expiringCount })}
        </p>
      </div>
    </div>
  );
}
