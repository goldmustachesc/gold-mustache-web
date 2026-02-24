import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";
import type { Reward } from "@/components/loyalty/RewardCard";

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
    queryFn: async () => {
      const response = await fetch("/api/admin/loyalty/accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch loyalty accounts");
      }
      const data = await response.json();
      return data.accounts as AdminLoyaltyAccount[];
    },
  });
}

export function useAdminAdjustPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      points,
      reason,
    }: {
      accountId: string;
      points: number;
      reason: string;
    }) => {
      const response = await fetch(
        `/api/admin/loyalty/accounts/${accountId}/adjust`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points, reason }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to adjust points");
      }
      return response.json();
    },
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
      // Invalidate queries to ensure fresh data after mutations
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "accounts"],
      });
    },
  });
}

// For toggling catalog items on/off - agora conectado ao backend real
export function useAdminToggleReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rewardId,
      active,
    }: {
      rewardId: string;
      active: boolean;
    }) => {
      const response = await fetch(
        `/api/admin/loyalty/rewards/${rewardId}/toggle`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to toggle reward");
      }
      return response.json();
    },
    onMutate: async ({ rewardId, active }) => {
      // Update otimista no cache
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

      // Update otimista para o hook público
      queryClient.setQueryData(
        ["loyalty", "rewards"],
        (old: Reward[] | undefined) => {
          if (!old) return old;
          return old.map((r: Reward) =>
            r.id === rewardId ? { ...r, active } : r,
          );
        },
      );

      // Update otimista para o hook de admin
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
      // Reverter em caso de erro
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
      // Invalidar queries para garantir dados atualizados
      queryClient.invalidateQueries({ queryKey: ["loyalty", "rewards"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    },
  });
}
