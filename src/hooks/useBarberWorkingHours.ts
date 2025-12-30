"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BarberWorkingHoursDay } from "@/types/booking";

type UpdateWorkingHoursInput = {
  days: Array<{
    dayOfWeek: number;
    isWorking: boolean;
    startTime?: string | null;
    endTime?: string | null;
    breakStart?: string | null;
    breakEnd?: string | null;
  }>;
};

// Cache configuration
const STALE_TIME = 30_000; // 30 seconds
const GC_TIME = 5 * 60_000; // 5 minutes

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/**
 * Fetch working hours for the logged-in barber
 */
async function fetchMyWorkingHours(): Promise<BarberWorkingHoursDay[]> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/barbers/me/working-hours`);
  const data = await res.json().catch(() => null);

  if (res.status === 401) throw new Error("Não autorizado");
  if (res.status === 404) throw new Error("Usuário não é barbeiro");
  if (!res.ok) throw new Error(data?.message || "Erro ao carregar horários");

  return data.days;
}

/**
 * Update working hours for the logged-in barber
 */
async function updateMyWorkingHours(
  input: UpdateWorkingHoursInput,
): Promise<BarberWorkingHoursDay[]> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/barbers/me/working-hours`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Erro ao salvar horários");
  }

  return data.days;
}

/**
 * Fetch working hours for a specific barber (admin)
 */
async function fetchBarberWorkingHours(barberId: string): Promise<{
  barber: { id: string; name: string };
  days: BarberWorkingHoursDay[];
}> {
  const baseUrl = getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/admin/barbers/${barberId}/working-hours`,
  );
  const data = await res.json().catch(() => null);

  if (res.status === 401) throw new Error("Não autorizado");
  if (res.status === 403) throw new Error("Acesso restrito a administradores");
  if (res.status === 404) throw new Error("Barbeiro não encontrado");
  if (!res.ok) throw new Error(data?.message || "Erro ao carregar horários");

  return data;
}

/**
 * Update working hours for a specific barber (admin)
 */
async function updateBarberWorkingHours(
  barberId: string,
  input: UpdateWorkingHoursInput,
): Promise<{
  barber: { id: string; name: string };
  days: BarberWorkingHoursDay[];
}> {
  const baseUrl = getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/admin/barbers/${barberId}/working-hours`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Erro ao salvar horários");
  }

  return data;
}

/**
 * Hook to fetch working hours for the logged-in barber
 */
export function useMyWorkingHours() {
  return useQuery({
    queryKey: ["my-working-hours"],
    queryFn: fetchMyWorkingHours,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

/**
 * Hook to update working hours for the logged-in barber
 */
export function useUpdateMyWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyWorkingHours,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-working-hours"],
      });
      // Also invalidate slots since they depend on working hours
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

/**
 * Hook to fetch working hours for a specific barber (admin)
 */
export function useBarberWorkingHours(barberId: string | null) {
  return useQuery({
    queryKey: ["barber-working-hours", barberId],
    queryFn: () => {
      if (!barberId) throw new Error("barberId is required");
      return fetchBarberWorkingHours(barberId);
    },
    enabled: !!barberId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

/**
 * Hook to update working hours for a specific barber (admin)
 */
export function useUpdateBarberWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      barberId,
      input,
    }: {
      barberId: string;
      input: UpdateWorkingHoursInput;
    }) => updateBarberWorkingHours(barberId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["barber-working-hours", variables.barberId],
      });
      // Also invalidate slots since they depend on working hours
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}
