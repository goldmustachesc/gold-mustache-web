"use client";

import type { LoyaltyTier } from "@/components/loyalty/TierBadge";
import type { AccountsParams, AccountsSortBy } from "@/hooks/useAdminLoyalty";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIERS: LoyaltyTier[] = ["BRONZE", "SILVER", "GOLD", "DIAMOND"];

const SORT_OPTIONS: AccountsSortBy[] = [
  "currentPoints",
  "lifetimePoints",
  "memberSince",
  "createdAt",
  "tier",
  "fullName",
];

export interface AccountFiltersState {
  search: string;
  tier?: LoyaltyTier;
  sortBy: AccountsSortBy;
  sortOrder: "asc" | "desc";
}

export const defaultAccountFiltersState: AccountFiltersState = {
  search: "",
  sortBy: "currentPoints",
  sortOrder: "desc",
};

/** Converte o estado dos filtros para o formato esperado por `useAdminLoyaltyAccounts`. */
export function accountFiltersToParams(
  state: AccountFiltersState,
): AccountsParams {
  return {
    search: state.search.trim() || undefined,
    tier: state.tier,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  };
}

export interface AccountFiltersProps {
  filters: AccountFiltersState;
  onChange: (next: AccountFiltersState) => void;
  className?: string;
}

export function AccountFilters({
  filters,
  onChange,
  className,
}: AccountFiltersProps) {
  const t = useTranslations("loyalty.admin.accounts.filters");

  const setTier = (tier: LoyaltyTier | undefined) => {
    onChange({ ...filters, tier });
  };

  const handleTierClick = (tier: LoyaltyTier) => {
    if (filters.tier === tier) {
      setTier(undefined);
    } else {
      setTier(tier);
    }
  };

  return (
    <div
      data-testid="account-filters"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          type="search"
          aria-label={t("searchAria")}
          placeholder={t("searchPlaceholder")}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("tierLabel")}
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filters.tier === undefined ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTier(undefined)}
            aria-pressed={filters.tier === undefined}
          >
            {t("tierAll")}
          </Button>
          {TIERS.map((tier) => (
            <Button
              key={tier}
              type="button"
              size="sm"
              variant={filters.tier === tier ? "default" : "outline"}
              className="rounded-full"
              onClick={() => handleTierClick(tier)}
              aria-pressed={filters.tier === tier}
            >
              {t(`tier.${tier}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="account-sort-by"
          className="text-xs text-muted-foreground"
        >
          {t("sortBy")}
        </Label>
        <div className="flex gap-2">
          <Select
            value={filters.sortBy}
            onValueChange={(v) =>
              onChange({ ...filters, sortBy: v as AccountsSortBy })
            }
          >
            <SelectTrigger id="account-sort-by" className="min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`sort.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() =>
              onChange({
                ...filters,
                sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
              })
            }
            aria-label={t("toggleSortOrder", {
              order: t(filters.sortOrder === "desc" ? "sortDesc" : "sortAsc"),
            })}
          >
            {filters.sortOrder === "desc" ? (
              <ArrowDown className="h-4 w-4" aria-hidden />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
