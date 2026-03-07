"use client";

import { useState } from "react";
import { useRedemptions } from "@/hooks/useLoyalty";
import { RedemptionCode } from "@/components/loyalty/RedemptionCode";
import { Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function RedemptionsPage() {
  const t = useTranslations("loyalty.redemptions");
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading } = useRedemptions(page, limit);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const redemptions = data?.data ?? [];
  const meta = data?.meta;
  const hasMultiplePages = meta ? meta.totalPages > 1 : false;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-playfair font-bold">{t("title")}</h2>
      </div>

      {redemptions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl flex flex-col items-center gap-4">
          <Ticket className="h-10 w-10 text-muted-foreground/60" />
          <p>{t("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {redemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  {redemption.reward?.name ?? t("unknownReward")}
                </span>
                <span className="text-sm text-muted-foreground font-mono tabular-nums">
                  {new Date(redemption.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <RedemptionCode
                code={redemption.code}
                status={redemption.status}
                expiresAt={redemption.expiresAt}
              />
            </div>
          ))}
        </div>
      )}

      {hasMultiplePages && meta && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label={t("pagination.previous")}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground font-mono tabular-nums">
            {page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= meta.totalPages}
            aria-label={t("pagination.next")}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
