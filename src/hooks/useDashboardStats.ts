"use client";

import type { DashboardStats } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) {
    throw new Error("Erro ao carregar estatísticas");
  }
  const data = await res.json();
  return data.stats;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
