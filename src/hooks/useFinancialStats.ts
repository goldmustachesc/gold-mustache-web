"use client";

import { useQuery } from "@tanstack/react-query";
import type { FinancialStats } from "@/types/financial";

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

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

async function fetchBarberFinancialStats(
  month: number,
  year: number,
): Promise<BarberFinancialResponse> {
  const baseUrl = getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/barbers/me/financial?month=${month}&year=${year}`,
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Erro ao carregar estatísticas");
  }

  return res.json();
}

async function fetchAdminFinancialStats(
  month: number,
  year: number,
  barberId?: string,
): Promise<AdminFinancialResponse> {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (barberId) {
    params.append("barberId", barberId);
  }

  const res = await fetch(
    `${baseUrl}/api/admin/financial?${params.toString()}`,
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Erro ao carregar estatísticas");
  }

  return res.json();
}

/**
 * Hook for barbers to fetch their own financial stats
 */
export function useBarberFinancialStats(month: number, year: number) {
  return useQuery({
    queryKey: ["financial-stats", "barber", month, year],
    queryFn: () => fetchBarberFinancialStats(month, year),
    staleTime: 5 * 60 * 1000, // 5 minutes - historical data rarely changes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for admins to fetch financial stats (all barbers or specific barber)
 */
export function useAdminFinancialStats(
  month: number,
  year: number,
  barberId?: string,
) {
  return useQuery({
    queryKey: ["financial-stats", "admin", month, year, barberId],
    queryFn: () => fetchAdminFinancialStats(month, year, barberId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Utility to get the last N months for the month selector
 */
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
