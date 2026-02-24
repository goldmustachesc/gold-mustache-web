import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";

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
        // Return mock data for frontend development if endpoint is missing
        return [
          {
            id: "1",
            userId: "u1",
            fullName: "Leonardo B.",
            email: "leo@example.com",
            points: 1200,
            tier: "SILVER",
          },
          {
            id: "2",
            userId: "u2",
            fullName: "Maria Silva",
            email: "maria@example.com",
            points: 300,
            tier: "BRONZE",
          },
          {
            id: "3",
            userId: "u3",
            fullName: "João Pedro",
            email: "joao@example.com",
            points: 3500,
            tier: "DIAMOND",
          },
        ] as AdminLoyaltyAccount[];
      }
      const data = await response.json();
      return data.accounts as AdminLoyaltyAccount[];
    },
    // Adding placeholder data for fast UI work
    placeholderData: [
      {
        id: "1",
        userId: "u1",
        fullName: "Leonardo B.",
        email: "leo@example.com",
        points: 1200,
        tier: "SILVER",
      },
      {
        id: "2",
        userId: "u2",
        fullName: "Maria Silva",
        email: "maria@example.com",
        points: 300,
        tier: "BRONZE",
      },
      {
        id: "3",
        userId: "u3",
        fullName: "João Pedro",
        email: "joao@example.com",
        points: 3500,
        tier: "DIAMOND",
      },
    ],
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

      queryClient.setQueryData(["admin", "loyalty", "accounts"], (old: any) => {
        if (!old) return old;
        return old.map((acc: any) =>
          acc.id === accountId ? { ...acc, points: acc.points + points } : acc,
        );
      });

      return { previousAccounts };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(
        ["admin", "loyalty", "accounts"],
        context?.previousAccounts,
      );
    },
    onSettled: () => {
      // Como a rota de mock sempre retorna dados fixos hoje, pausamos a invalidação real
      // Ao espetar no backend final, descomentar a linha abaixo.
      // queryClient.invalidateQueries({ queryKey: ["admin", "loyalty", "accounts"] });
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
      queryClient.setQueryData(["loyalty", "rewards"], (old: any) => {
        if (!old) return old;
        return old.map((r: any) => (r.id === rewardId ? { ...r, active } : r));
      });

      // Update otimista para o hook de admin
      queryClient.setQueryData(["admin", "loyalty", "rewards"], (old: any) => {
        if (!old) return old;
        return old.map((r: any) => (r.id === rewardId ? { ...r, active } : r));
      });

      return { previousRewards, previousAdminRewards };
    },
    onError: (_err, _variables, context) => {
      // Reverter em caso de erro
      queryClient.setQueryData(
        ["loyalty", "rewards"],
        context?.previousRewards,
      );
      queryClient.setQueryData(
        ["admin", "loyalty", "rewards"],
        context?.previousAdminRewards,
      );
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
