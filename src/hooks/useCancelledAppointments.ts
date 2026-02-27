"use client";

import { useQuery } from "@tanstack/react-query";
import type { CancelledAppointmentData } from "@/app/api/barbers/me/cancelled-appointments/route";
import { apiGet } from "@/lib/api/client";

export function useCancelledAppointments() {
  return useQuery({
    queryKey: ["cancelled-appointments"],
    queryFn: () =>
      apiGet<CancelledAppointmentData[]>(
        "/api/barbers/me/cancelled-appointments",
      ),
    staleTime: 30000,
  });
}

export type { CancelledAppointmentData };
