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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    if (type === "EARNED" || type === "ADJUSTED_ADD") {
      return <ArrowUpRight className="h-5 w-5 text-emerald-500" />;
    }
    return <ArrowDownRight className="h-5 w-5 text-red-500" />;
  };

  const getTypeLabel = (type: string) => {
    const key = type.startsWith("ADJUSTED") ? "ADJUSTED" : type;
    // In next-intl, if a key doesn't exist it returns the key path, so we can check it.
    // For now, we assume the translations are mapped in `history.types.[type]`.
    return t(`types.${key}` as `types.${string}`) || type;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-amber-500" />
          {t("title")}
        </h2>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-zinc-800 text-zinc-400">
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
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-300">
                        {new Intl.DateTimeFormat(
                          locale === "pt-BR" ? "pt-BR" : "en-US",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        ).format(new Date(tx.createdAt))}
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-medium">
                        {tx.description}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tx.type)}
                          <span className="text-zinc-400">
                            {getTypeLabel(tx.type)}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-black ${
                          tx.points > 0 ? "text-emerald-500" : "text-red-500"
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
                    className="px-6 py-12 text-center text-zinc-500"
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
