import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Reward } from "@/components/loyalty/RewardCard";

export interface AdminReward extends Reward {
  totalRedemptions?: number;
  activeRedemptions?: number;
  type?: string;
  value?: number;
  serviceId?: string;
  stock?: number;
  createdAt: string;
  updatedAt: string;
}

// Hook para listar todos os rewards (admin)
export function useAdminRewards() {
  return useQuery({
    queryKey: ["admin", "loyalty", "rewards"],
    queryFn: async () => {
      const response = await fetch("/api/admin/loyalty/rewards");
      if (!response.ok) {
        throw new Error("Failed to fetch admin rewards");
      }
      const data = await response.json();
      return data.rewards as AdminReward[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para obter um reward específico
export function useAdminReward(id: string) {
  return useQuery({
    queryKey: ["admin", "loyalty", "rewards", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/loyalty/rewards/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reward");
      }
      const data = await response.json();
      return data.data as AdminReward;
    },
    enabled: !!id,
  });
}

// Hook para criar um novo reward
export function useAdminCreateReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardData: Partial<AdminReward>) => {
      const response = await fetch("/api/admin/loyalty/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create reward");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    },
  });
}

// Hook para atualizar um reward existente
export function useAdminUpdateReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AdminReward>;
    }) => {
      const response = await fetch(`/api/admin/loyalty/rewards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update reward");
      }
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards", id],
      });
    },
  });
}

// Hook para deletar um reward
export function useAdminDeleteReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/loyalty/rewards/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete reward");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    },
  });
}
