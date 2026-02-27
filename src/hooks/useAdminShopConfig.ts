"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShopClosureData, ShopHoursData } from "@/types/booking";
import { apiGet, apiMutate, apiAction } from "@/lib/api/client";

type UpdateShopHoursInput = {
  days: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    startTime?: string | null;
    endTime?: string | null;
    breakStart?: string | null;
    breakEnd?: string | null;
  }>;
};

type CreateShopClosureInput = {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

export function useAdminShopHours() {
  return useQuery({
    queryKey: ["admin-shop-hours"],
    queryFn: () => apiGet<ShopHoursData[]>("/api/admin/shop-hours"),
  });
}

export function useUpdateAdminShopHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateShopHoursInput) =>
      apiMutate<ShopHoursData[]>("/api/admin/shop-hours", "PUT", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shop-hours"] });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useAdminShopClosures(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const query = params.toString();

  return useQuery({
    queryKey: ["admin-shop-closures", startDate ?? null, endDate ?? null],
    queryFn: () =>
      apiGet<ShopClosureData[]>(
        `/api/admin/shop-closures${query ? `?${query}` : ""}`,
      ),
  });
}

export function useCreateAdminShopClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShopClosureInput) =>
      apiMutate<ShopClosureData>("/api/admin/shop-closures", "POST", input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-shop-closures"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useDeleteAdminShopClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiAction(`/api/admin/shop-closures/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-shop-closures"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}
