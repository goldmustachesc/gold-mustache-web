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

export function useAdminLoyaltyAccounts() {
  return useQuery({
    queryKey: ["admin", "loyalty", "accounts"],
    queryFn: () => apiGet<AdminLoyaltyAccount[]>("/api/admin/loyalty/accounts"),
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
      });
      const previousAccounts = queryClient.getQueryData([
        "admin",
        "loyalty",
        "accounts",
      ]);

      queryClient.setQueryData(
        ["admin", "loyalty", "accounts"],
        (old: AdminLoyaltyAccount[] | undefined) => {
          if (!old) return old;
          return old.map((acc: AdminLoyaltyAccount) =>
            acc.id === accountId
              ? { ...acc, points: Math.max(0, acc.points + points) }
              : acc,
          );
        },
      );

      return { previousAccounts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(
          ["admin", "loyalty", "accounts"],
          context.previousAccounts,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "accounts"],
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
