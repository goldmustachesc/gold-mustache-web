"use client";

import { useLoyaltyTransactions } from "@/hooks/useLoyalty";
import { Loader2, ArrowDownRight, ArrowUpRight, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function LoyaltyHistoryPage() {
  const { data: transactions, isLoading } = useLoyaltyTransactions();
  const t = useTranslations("loyalty.history");
  const params = useParams();
  const locale = params.locale as string;

  const POSITIVE_TYPES = new Set([
    "EARNED",
    "EARNED_APPOINTMENT",
    "EARNED_REFERRAL",
    "EARNED_REVIEW",
    "EARNED_CHECKIN",
    "EARNED_BIRTHDAY",
    "EARNED_BONUS",
    "ADJUSTED_ADD",
  ]);

  const TYPE_TRANSLATION_ALIAS: Record<string, string> = {
    ADJUSTED_ADD: "ADJUSTED",
    ADJUSTED_REMOVE: "ADJUSTED",
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    if (POSITIVE_TYPES.has(type)) {
      return <ArrowUpRight className="h-5 w-5 text-success" />;
    }
    return <ArrowDownRight className="h-5 w-5 text-destructive" />;
  };

  const getTypeLabel = (type: string) => {
    const key = TYPE_TRANSLATION_ALIAS[type] ?? type;
    return t(`types.${key}` as `types.${string}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-playfair font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          {t("title")}
        </h2>
      </div>

      <div className="lg:hidden space-y-3">
        {transactions && transactions.length > 0 ? (
          transactions.map(
            (tx: {
              id: string;
              createdAt: string;
              description: string;
              type: string;
              points: number;
            }) => (
              <div
                key={tx.id}
                className="bg-card border border-border rounded-xl p-4 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(tx.type)}
                    <span className="text-sm text-muted-foreground">
                      {getTypeLabel(tx.type)}
                    </span>
                  </div>
                  <span
                    className={`font-black font-mono tabular-nums text-sm ${
                      tx.points > 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {tx.points > 0 ? "+" : ""}
                    {tx.points}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {tx.description}
                </p>
                <p className="text-xs font-mono tabular-nums text-muted-foreground">
                  {new Intl.DateTimeFormat(
                    locale === "pt-BR" ? "pt-BR" : "en-US",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    },
                  ).format(new Date(tx.createdAt))}
                </p>
              </div>
            ),
          )
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            {t("empty")}
          </div>
        )}
      </div>

      <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted text-muted-foreground tracking-wider">
              <tr>
                <th className="px-6 py-4">{t("columns.date")}</th>
                <th className="px-6 py-4">{t("columns.description")}</th>
                <th className="px-6 py-4">{t("columns.type")}</th>
                <th className="px-6 py-4 text-right">{t("columns.points")}</th>
              </tr>
            </thead>
            <tbody>
              {transactions && transactions.length > 0 ? (
                transactions.map(
                  (tx: {
                    id: string;
                    createdAt: string;
                    description: string;
                    type: string;
                    points: number;
                  }) => (
                    <tr
                      key={tx.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-foreground font-mono tabular-nums text-xs">
                        {new Intl.DateTimeFormat(
                          locale === "pt-BR" ? "pt-BR" : "en-US",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        ).format(new Date(tx.createdAt))}
                      </td>
                      <td className="px-6 py-4 text-foreground font-medium">
                        {tx.description}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tx.type)}
                          <span className="text-muted-foreground">
                            {getTypeLabel(tx.type)}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-black font-mono tabular-nums ${
                          tx.points > 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points}
                      </td>
                    </tr>
                  ),
                )
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
