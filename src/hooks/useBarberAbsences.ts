"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BarberAbsenceData } from "@/types/booking";
import { apiGet, apiMutate, apiAction, ApiError } from "@/lib/api/client";

type CreateAbsenceInput = {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

async function createAbsence(
  input: CreateAbsenceInput,
): Promise<BarberAbsenceData> {
  try {
    return await apiMutate<BarberAbsenceData>(
      "/api/barbers/me/absences",
      "POST",
      input,
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "ABSENCE_CONFLICT") {
      throw new Error(error.message);
    }
    throw error;
  }
}

export function useBarberAbsences(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const query = params.toString();

  return useQuery({
    queryKey: ["barber-absences", startDate ?? null, endDate ?? null],
    queryFn: () =>
      apiGet<BarberAbsenceData[]>(
        `/api/barbers/me/absences${query ? `?${query}` : ""}`,
      ),
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
    mutationFn: (id: string) =>
      apiAction(`/api/barbers/me/absences/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["barber-absences"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}
