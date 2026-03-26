"use client";

import { useQuery } from "@tanstack/react-query";
import type { FinancialStats } from "@/types/financial";
import { apiGet } from "@/lib/api/client";

interface BarberOption {
  id: string;
  name: string;
}

interface BarberFinancialResponse {
  stats: FinancialStats;
  barberName: string;
}

interface AdminFinancialResponse {
  stats: FinancialStats;
  barberName: string;
  barbers: BarberOption[];
}

export function useBarberFinancialStats(month: number, year: number) {
  return useQuery({
    queryKey: ["financial-stats", "barber", month, year],
    queryFn: () =>
      apiGet<BarberFinancialResponse>(
        `/api/barbers/me/financial?month=${month}&year=${year}`,
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminFinancialStats(
  month: number,
  year: number,
  barberId?: string,
) {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (barberId) params.append("barberId", barberId);

  return useQuery({
    queryKey: ["financial-stats", "admin", month, year, barberId],
    queryFn: () =>
      apiGet<AdminFinancialResponse>(
        `/api/admin/financial?${params.toString()}`,
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function getLastMonths(
  count: number = 4,
): Array<{ month: number; year: number; label: string }> {
  const months: Array<{ month: number; year: number; label: string }> = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const monthNames = [
      "JAN",
      "FEV",
      "MAR",
      "ABR",
      "MAI",
      "JUN",
      "JUL",
      "AGO",
      "SET",
      "OUT",
      "NOV",
      "DEZ",
    ];

    const label =
      i === 0
        ? monthNames[month - 1]
        : `${monthNames[month - 1]} ${String(year).slice(2)}`;

    months.push({ month, year, label });
  }

  return months.reverse();
}

export type { BarberOption, BarberFinancialResponse, AdminFinancialResponse };
