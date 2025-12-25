"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShopClosureData, ShopHoursData } from "@/types/booking";

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
  date: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

async function fetchShopHours(): Promise<ShopHoursData[]> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/shop-hours`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao carregar horários");
  return data.days;
}

async function updateShopHours(
  input: UpdateShopHoursInput,
): Promise<ShopHoursData[]> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/shop-hours`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao salvar horários");
  return data.days;
}

async function fetchShopClosures(
  startDate?: string,
  endDate?: string,
): Promise<ShopClosureData[]> {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/api/admin/shop-closures`);
  if (startDate) url.searchParams.set("startDate", startDate);
  if (endDate) url.searchParams.set("endDate", endDate);
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao carregar fechamentos");
  return data.closures;
}

async function createShopClosure(
  input: CreateShopClosureInput,
): Promise<ShopClosureData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/shop-closures`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao criar fechamento");
  return data.closure;
}

async function deleteShopClosure(id: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/shop-closures/${id}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao remover fechamento");
}

export function useAdminShopHours() {
  return useQuery({
    queryKey: ["admin-shop-hours"],
    queryFn: fetchShopHours,
  });
}

export function useUpdateAdminShopHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateShopHours,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shop-hours"] });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useAdminShopClosures(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["admin-shop-closures", startDate ?? null, endDate ?? null],
    queryFn: () => fetchShopClosures(startDate, endDate),
  });
}

export function useCreateAdminShopClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShopClosure,
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
    mutationFn: deleteShopClosure,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-shop-closures"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}
