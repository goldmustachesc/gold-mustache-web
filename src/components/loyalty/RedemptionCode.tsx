"use client";

import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatDateShort } from "@/utils/datetime";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { RedemptionStatus } from "@/types/loyalty";

export type { RedemptionStatus } from "@/types/loyalty";

interface RedemptionCodeProps {
  code: string;
  status: RedemptionStatus;
  expiresAt: string;
}

const STATUS_STYLES: Record<RedemptionStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  USED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  EXPIRED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

const STATUS_KEYS: Record<RedemptionStatus, string> = {
  PENDING: "status.pending",
  USED: "status.used",
  EXPIRED: "status.expired",
};

export function RedemptionCode({
  code,
  status,
  expiresAt,
}: RedemptionCodeProps) {
  const t = useTranslations("loyalty.redemptions");
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-lg tracking-widest font-bold text-primary truncate">
          {code}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}
        >
          {t(STATUS_KEYS[status])}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm text-zinc-400">
          {formatDateShort(expiresAt)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => copy(code)}
          aria-label={t("copyCode")}
          className="h-8 w-8 text-zinc-400 hover:text-white"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
