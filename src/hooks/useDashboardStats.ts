"use client";

import type { DashboardStats } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";

export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiGet<DashboardStats>("/api/dashboard/stats"),
    enabled,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });
}
