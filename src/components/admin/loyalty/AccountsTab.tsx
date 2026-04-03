"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAdminLoyaltyAccounts,
  type AccountsSortBy,
  type AdminLoyaltyAccount,
} from "@/hooks/useAdminLoyalty";
import {
  AccountFilters,
  accountFiltersToParams,
  defaultAccountFiltersState,
} from "@/components/admin/loyalty/AccountFilters";
import { ExpirationAlert } from "@/components/admin/loyalty/ExpirationAlert";
import { AccountCard } from "@/components/admin/loyalty/AccountCard";
import { AdjustPointsDialog } from "@/components/admin/loyalty/AdjustPointsDialog";
import { TierBadge } from "@/components/loyalty/TierBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowLeftRight, ArrowUp, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const PAGE_SIZE = 25;

const TABLE_SORT_COLUMNS: AccountsSortBy[] = [
  "fullName",
  "tier",
  "currentPoints",
  "lifetimePoints",
  "memberSince",
];

const COLUMN_I18N: Record<AccountsSortBy, string> = {
  fullName: "client",
  tier: "tier",
  currentPoints: "currentPoints",
  lifetimePoints: "lifetimePoints",
  memberSince: "memberSince",
  createdAt: "memberSince",
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

function SortableTableHead({
  column,
  label,
  active,
  order,
  onSort,
  sortLabel,
  align = "left",
}: {
  column: AccountsSortBy;
  label: string;
  active: boolean;
  order: "asc" | "desc";
  onSort: (c: AccountsSortBy) => void;
  sortLabel: string;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn("px-6 py-4", align === "right" && "text-right")}
      aria-sort={
        active ? (order === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        className={cn(
          "-m-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          align === "right" ? "ml-auto w-full justify-end" : "text-left",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => onSort(column)}
        aria-label={sortLabel}
      >
        <span>{label}</span>
        {active ? (
          order === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : null}
      </button>
    </th>
  );
}

export function AccountsTab() {
  const tAdmin = useTranslations("loyalty.admin");
  const tAccounts = useTranslations("loyalty.admin.accounts");
  const locale = useLocale();

  const [filters, setFilters] = useState(defaultAccountFiltersState);
  const debouncedSearch = useDebouncedValue(filters.search.trim(), 300);
  const [page, setPage] = useState(1);
  const [selectedAccount, setSelectedAccount] =
    useState<AdminLoyaltyAccount | null>(null);

  const apiParams = useMemo(
    () =>
      accountFiltersToParams({
        search: debouncedSearch,
        tier: filters.tier,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    [debouncedSearch, filters.tier, filters.sortBy, filters.sortOrder],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: voltar à página 1 quando filtros da API mudam
  useEffect(() => {
    setPage(1);
  }, [apiParams]);

  const { data, isLoading, isError } = useAdminLoyaltyAccounts(
    page,
    PAGE_SIZE,
    apiParams,
  );

  const accounts = data?.accounts ?? [];
  const meta = data?.meta;

  const handleHeaderSort = (column: AccountsSortBy) => {
    setFilters((prev) => {
      if (prev.sortBy === column) {
        return {
          ...prev,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      }
      const defaultOrder: "asc" | "desc" =
        column === "fullName" ||
        column === "tier" ||
        column === "memberSince" ||
        column === "createdAt"
          ? "asc"
          : "desc";
      return { ...prev, sortBy: column, sortOrder: defaultOrder };
    });
  };

  const formatMemberSince = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(locale, { dateStyle: "medium" });
    } catch {
      return iso;
    }
  };

  const openAdjust = (acc: AdminLoyaltyAccount) => {
    setSelectedAccount(acc);
  };

  return (
    <div data-testid="accounts-tab" className="space-y-6 md:space-y-8">
      <AccountFilters filters={filters} onChange={setFilters} />

      <ExpirationAlert />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {tAccounts("table.loadError")}
        </p>
      ) : (
        <>
          <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                  <tr>
                    {TABLE_SORT_COLUMNS.map((col) => {
                      const label = tAccounts(
                        `table.columns.${COLUMN_I18N[col]}`,
                      );
                      const sortLabel = tAccounts("table.sortByColumn", {
                        column: label,
                      });
                      const align =
                        col === "currentPoints" || col === "lifetimePoints"
                          ? "right"
                          : "left";
                      return (
                        <SortableTableHead
                          key={col}
                          column={col}
                          label={label}
                          active={filters.sortBy === col}
                          order={filters.sortOrder}
                          onSort={handleHeaderSort}
                          sortLabel={sortLabel}
                          align={align}
                        />
                      );
                    })}
                    <th scope="col" className="px-6 py-4 text-right">
                      {tAccounts("table.columns.redemptions")}
                    </th>
                    <th scope="col" className="px-6 py-4 text-right">
                      {tAccounts("table.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {acc.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {acc.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TierBadge tier={acc.tier} />
                      </td>
                      <td className="px-6 py-4 text-right font-black font-mono tabular-nums text-primary text-lg">
                        {acc.points}
                      </td>
                      <td className="px-6 py-4 text-right font-mono tabular-nums text-foreground">
                        {acc.lifetimePoints}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {formatMemberSince(acc.memberSince)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono tabular-nums">
                        {acc.redemptionCount}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openAdjust(acc)}
                        >
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          {tAdmin("adjustPoints")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-muted-foreground"
                      >
                        {tAccounts("table.empty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:hidden space-y-3">
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onAdjustPoints={() => openAdjust(acc)}
              />
            ))}
            {accounts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {tAccounts("table.empty")}
              </div>
            ) : null}
          </div>

          {meta && meta.totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {tAccounts("table.pageStatus", {
                  page: meta.page,
                  totalPages: meta.totalPages,
                  total: meta.total,
                })}
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {tAccounts("table.previous")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tAccounts("table.next")}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <AdjustPointsDialog
        open={!!selectedAccount}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
      />
    </div>
  );
}
