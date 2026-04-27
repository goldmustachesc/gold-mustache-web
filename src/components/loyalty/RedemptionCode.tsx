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
  PENDING: "bg-warning/10 text-warning border-warning/30",
  USED: "bg-success/10 text-success border-success/30",
  EXPIRED: "bg-muted text-muted-foreground border-border",
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
        <span className="text-sm text-muted-foreground font-mono tabular-nums">
          {formatDateShort(expiresAt)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => copy(code)}
          aria-label={t("copyCode")}
          className="text-muted-foreground hover:text-foreground"
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
