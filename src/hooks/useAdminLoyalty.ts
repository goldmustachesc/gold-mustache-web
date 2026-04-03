import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";
import type { Reward } from "@/components/loyalty/RewardCard";
import type { RedemptionStatus, LoyaltyReportsData } from "@/types/loyalty";
import {
  apiGet,
  apiGetCollection,
  apiMutate,
  apiAction,
} from "@/lib/api/client";

export interface AdminLoyaltyAccount {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  points: number;
  tier: LoyaltyTier;
}

/** Conta admin com campos extras retornados pela API de listagem. */
export interface AdminLoyaltyAccountExtended extends AdminLoyaltyAccount {
  lifetimePoints: number;
  memberSince: string;
  redemptionCount: number;
}

export type AccountsSortBy =
  | "lifetimePoints"
  | "currentPoints"
  | "memberSince"
  | "createdAt"
  | "tier"
  | "fullName";

export interface AccountsParams {
  search?: string;
  tier?: LoyaltyTier;
  sortBy?: AccountsSortBy;
  sortOrder?: "asc" | "desc";
}

interface PaginatedAccountsResponse {
  data: AdminLoyaltyAccountExtended[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function buildAdminAccountsQuery(
  page: number,
  limit: number,
  params?: AccountsParams,
): string {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params?.search) searchParams.set("search", params.search);
  if (params?.tier) searchParams.set("tier", params.tier);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
  return `/api/admin/loyalty/accounts?${searchParams.toString()}`;
}

export function useAdminLoyaltyAccounts(
  page = 1,
  limit = 50,
  params?: AccountsParams,
) {
  return useQuery({
    queryKey: ["admin", "loyalty", "accounts", { page, limit, params }],
    queryFn: () =>
      apiGet<PaginatedAccountsResponse>(
        buildAdminAccountsQuery(page, limit, params),
      ),
    staleTime: 60 * 1000,
    select: (response) => response.data,
  });
}

export interface AdminAccountTransaction {
  id: string;
  loyaltyAccountId: string;
  type: string;
  points: number;
  description: string | null;
  referenceId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface PaginatedTransactionsResponse {
  data: AdminAccountTransaction[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useAdminAccountTransactions(
  accountId: string,
  page = 1,
  limit = 50,
  enabled = false,
) {
  return useQuery({
    queryKey: [
      "admin",
      "loyalty",
      "accounts",
      accountId,
      "transactions",
      { page, limit },
    ],
    queryFn: () =>
      apiGet<PaginatedTransactionsResponse>(
        `/api/admin/loyalty/accounts/${encodeURIComponent(accountId)}/transactions?page=${page}&limit=${limit}`,
      ),
    select: (response) => response.data,
    enabled: enabled && Boolean(accountId),
    staleTime: 60 * 1000,
  });
}

/** Transação com expiração próxima (formato do GET expiring-points). */
export interface AdminExpiringPointTransaction {
  id: string;
  points: number;
  expiresAt: string | null;
}

export function useAdminExpiringPoints() {
  return useQuery({
    queryKey: ["admin", "loyalty", "expiring-points"],
    queryFn: () =>
      apiGet<AdminExpiringPointTransaction[]>(
        "/api/admin/loyalty/expiring-points",
      ),
    staleTime: 60 * 1000,
  });
}

export function useAdminAdjustPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      points,
      reason,
    }: {
      accountId: string;
      points: number;
      reason: string;
    }) =>
      apiAction(`/api/admin/loyalty/accounts/${accountId}/adjust`, "POST", {
        points,
        reason,
      }),
    onMutate: async ({ accountId, points }) => {
      await queryClient.cancelQueries({
        queryKey: ["admin", "loyalty", "accounts"],
        exact: false,
      });
      const previousQueries = queryClient.getQueriesData({
        queryKey: ["admin", "loyalty", "accounts"],
      });

      queryClient.setQueriesData(
        { queryKey: ["admin", "loyalty", "accounts"] },
        (old: PaginatedAccountsResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((acc) =>
              acc.id === accountId
                ? { ...acc, points: Math.max(0, acc.points + points) }
                : acc,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "accounts"],
        exact: false,
      });
    },
  });
}

export function useAdminToggleReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rewardId, active }: { rewardId: string; active: boolean }) =>
      apiMutate<Reward>(
        `/api/admin/loyalty/rewards/${rewardId}/toggle`,
        "PUT",
        { active },
      ),
    onMutate: async ({ rewardId, active }) => {
      await queryClient.cancelQueries({ queryKey: ["loyalty", "rewards"] });
      await queryClient.cancelQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });

      const previousRewards = queryClient.getQueryData(["loyalty", "rewards"]);
      const previousAdminRewards = queryClient.getQueryData([
        "admin",
        "loyalty",
        "rewards",
      ]);

      queryClient.setQueryData(
        ["loyalty", "rewards"],
        (old: Reward[] | undefined) => {
          if (!old) return old;
          return old.map((r: Reward) =>
            r.id === rewardId ? { ...r, active } : r,
          );
        },
      );

      queryClient.setQueryData(
        ["admin", "loyalty", "rewards"],
        (old: Reward[] | undefined) => {
          if (!old) return old;
          return old.map((r: Reward) =>
            r.id === rewardId ? { ...r, active } : r,
          );
        },
      );

      return { previousRewards, previousAdminRewards };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData(
          ["loyalty", "rewards"],
          context.previousRewards,
        );
      }
      if (context?.previousAdminRewards) {
        queryClient.setQueryData(
          ["admin", "loyalty", "rewards"],
          context.previousAdminRewards,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "rewards"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    },
  });
}

export function useAdminLoyaltyReports() {
  return useQuery({
    queryKey: ["admin", "loyalty", "reports"],
    queryFn: () => apiGet<LoyaltyReportsData>("/api/admin/loyalty/reports"),
    staleTime: 2 * 60 * 1000,
  });
}

export interface AdminRedemption {
  id: string;
  code: string;
  pointsSpent: number;
  clientName: string | null;
  clientEmail: string | null;
  rewardName: string;
  rewardType: string;
  rewardValue: number | null;
  status: RedemptionStatus;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export function useAdminRedemptions(status?: string, page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);

  return useQuery({
    queryKey: ["admin", "loyalty", "redemptions", { status, page }],
    queryFn: () =>
      apiGetCollection<AdminRedemption>(
        `/api/admin/loyalty/redemptions?${params}`,
      ),
    staleTime: 30 * 1000,
  });
}

export function useAdminValidateRedemption() {
  return useMutation({
    mutationFn: (code: string) =>
      apiGet<AdminRedemption>(`/api/admin/loyalty/redemptions?code=${code}`),
  });
}

export function useAdminUseRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      apiMutate("/api/admin/loyalty/redemptions/use", "POST", { code }),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "redemptions"],
      });
    },
  });
}
