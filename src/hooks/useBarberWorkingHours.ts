"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BarberWorkingHoursDay } from "@/types/booking";
import { apiGet, apiMutate } from "@/lib/api/client";

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

const STALE_TIME = 30_000;
const GC_TIME = 5 * 60_000;

export function useMyWorkingHours() {
  return useQuery({
    queryKey: ["my-working-hours"],
    queryFn: () =>
      apiGet<BarberWorkingHoursDay[]>("/api/barbers/me/working-hours"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useUpdateMyWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkingHoursInput) =>
      apiMutate<BarberWorkingHoursDay[]>(
        "/api/barbers/me/working-hours",
        "PUT",
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-working-hours"] });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useBarberWorkingHours(barberId: string | null) {
  return useQuery({
    queryKey: ["barber-working-hours", barberId],
    queryFn: () => {
      if (!barberId) throw new Error("barberId is required");
      return apiGet<{
        barber: { id: string; name: string };
        days: BarberWorkingHoursDay[];
      }>(`/api/admin/barbers/${barberId}/working-hours`);
    },
    enabled: !!barberId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useUpdateBarberWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      barberId,
      input,
    }: {
      barberId: string;
      input: UpdateWorkingHoursInput;
    }) =>
      apiMutate<{
        barber: { id: string; name: string };
        days: BarberWorkingHoursDay[];
      }>(`/api/admin/barbers/${barberId}/working-hours`, "PUT", input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["barber-working-hours", variables.barberId],
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}
