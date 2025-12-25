"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BarberAbsenceData } from "@/types/booking";

type CreateAbsenceInput = {
  date: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

async function fetchAbsences(
  startDate?: string,
  endDate?: string,
): Promise<BarberAbsenceData[]> {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/api/barbers/me/absences`);
  if (startDate) url.searchParams.set("startDate", startDate);
  if (endDate) url.searchParams.set("endDate", endDate);

  const res = await fetch(url.toString());
  if (res.status === 401) throw new Error("Não autorizado");
  if (!res.ok) throw new Error("Erro ao carregar ausências");
  const data = await res.json();
  return data.absences;
}

async function createAbsence(
  input: CreateAbsenceInput,
): Promise<BarberAbsenceData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/barbers/me/absences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data?.error === "ABSENCE_CONFLICT") {
      const conflictsCount = Array.isArray(data?.conflicts)
        ? data.conflicts.length
        : 0;
      throw new Error(
        `Conflito: existem ${conflictsCount} agendamento(s) confirmado(s) no período.`,
      );
    }
    throw new Error(data?.message || "Erro ao criar ausência");
  }

  return data.absence;
}

async function deleteAbsence(id: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/barbers/me/absences/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao remover ausência");
}

export function useBarberAbsences(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["barber-absences", startDate ?? null, endDate ?? null],
    queryFn: () => fetchAbsences(startDate, endDate),
  });
}

export function useCreateBarberAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["barber-absences"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useDeleteBarberAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["barber-absences"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}
