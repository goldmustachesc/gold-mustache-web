"use client";

import { useQuery } from "@tanstack/react-query";
import type { CancelledAppointmentData } from "@/app/api/barbers/me/cancelled-appointments/route";

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

interface CancelledAppointmentsResponse {
  appointments: CancelledAppointmentData[];
}

async function fetchCancelledAppointments(): Promise<
  CancelledAppointmentData[]
> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/barbers/me/cancelled-appointments`);

  if (!res.ok) {
    throw new Error("Erro ao buscar agendamentos cancelados");
  }

  const data: CancelledAppointmentsResponse = await res.json();
  return data.appointments;
}

export function useCancelledAppointments() {
  return useQuery({
    queryKey: ["cancelled-appointments"],
    queryFn: fetchCancelledAppointments,
    staleTime: 30000, // 30 seconds
  });
}

export type { CancelledAppointmentData };
