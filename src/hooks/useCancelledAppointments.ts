"use client";

import { useQuery } from "@tanstack/react-query";
import type { CancelledAppointmentData } from "@/app/api/barbers/me/cancelled-appointments/route";
import { apiGetCollection } from "@/lib/api/client";

export function useCancelledAppointments(page = 1, limit = 20) {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  return useQuery({
    queryKey: ["cancelled-appointments", page, limit],
    queryFn: () =>
      apiGetCollection<CancelledAppointmentData>(
        `/api/barbers/me/cancelled-appointments?${params}`,
      ),
    staleTime: 30000,
  });
}

export type { CancelledAppointmentData };
