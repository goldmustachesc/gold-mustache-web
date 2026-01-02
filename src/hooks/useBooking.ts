"use client";

import type {
  ServiceData,
  TimeSlot,
  CreateAppointmentInput,
  CreateGuestAppointmentInput,
  AppointmentWithDetails,
  BarberData,
} from "@/types/booking";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateToString } from "@/utils/time-slots";
import { getGuestToken, setGuestToken } from "@/lib/guest-session";

async function fetchBarbers(): Promise<BarberData[]> {
  const res = await fetch("/api/barbers");
  if (!res.ok) throw new Error("Erro ao carregar barbeiros");
  const data = await res.json();
  return data.barbers;
}

async function fetchServices(barberId?: string): Promise<ServiceData[]> {
  const url = barberId ? `/api/services?barberId=${barberId}` : "/api/services";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao carregar serviços");
  const data = await res.json();
  return data.services;
}

async function fetchSlots(
  date: string,
  barberId: string,
  serviceId: string,
): Promise<TimeSlot[]> {
  const res = await fetch(
    `/api/slots?date=${date}&barberId=${barberId}&serviceId=${serviceId}`,
  );
  if (!res.ok) throw new Error("Erro ao carregar horários");
  const data = await res.json();
  return data.slots;
}

async function createAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentWithDetails> {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.error === "SLOT_IN_PAST") {
      throw new Error(
        "Este horário já passou. Por favor, escolha outro horário.",
      );
    }
    if (error.error === "SHOP_CLOSED") {
      throw new Error(
        "A barbearia não atende neste horário. Por favor, escolha outro.",
      );
    }
    if (error.error === "BARBER_UNAVAILABLE") {
      throw new Error(
        "Este barbeiro não atende neste horário. Por favor, escolha outro.",
      );
    }
    if (error.error === "SLOT_UNAVAILABLE") {
      throw new Error(
        "Este horário não está disponível. Por favor, escolha outro.",
      );
    }
    if (error.error === "SLOT_OCCUPIED") {
      throw new Error(
        "Este horário já foi reservado. Por favor, escolha outro.",
      );
    }
    throw new Error(error.message || "Erro ao criar agendamento");
  }

  const data = await res.json();
  return data.appointment;
}

interface GuestAppointmentResponse {
  appointment: AppointmentWithDetails;
  accessToken: string;
}

async function createGuestAppointment(
  input: CreateGuestAppointmentInput,
): Promise<GuestAppointmentResponse> {
  const res = await fetch("/api/appointments/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.error === "SLOT_IN_PAST") {
      throw new Error(
        "Este horário já passou. Por favor, escolha outro horário.",
      );
    }
    if (error.error === "SHOP_CLOSED") {
      throw new Error(
        "A barbearia não atende neste horário. Por favor, escolha outro.",
      );
    }
    if (error.error === "BARBER_UNAVAILABLE") {
      throw new Error(
        "Este barbeiro não atende neste horário. Por favor, escolha outro.",
      );
    }
    if (error.error === "SLOT_UNAVAILABLE") {
      throw new Error(
        "Este horário não está disponível. Por favor, escolha outro.",
      );
    }
    if (error.error === "SLOT_OCCUPIED") {
      throw new Error(
        "Este horário já foi reservado. Por favor, escolha outro.",
      );
    }
    throw new Error(error.message || "Erro ao criar agendamento");
  }

  const data = await res.json();
  return { appointment: data.appointment, accessToken: data.accessToken };
}

async function fetchClientAppointments(): Promise<AppointmentWithDetails[]> {
  const res = await fetch("/api/appointments");
  if (!res.ok) throw new Error("Erro ao carregar agendamentos");
  const data = await res.json();
  return data.appointments;
}

export function useBarbers() {
  return useQuery({
    queryKey: ["barbers"],
    queryFn: fetchBarbers,
  });
}

async function cancelAppointment(
  appointmentId: string,
  reason?: string,
): Promise<AppointmentWithDetails> {
  const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.error === "APPOINTMENT_IN_PAST") {
      throw new Error("Este agendamento já passou e não pode ser cancelado.");
    }
    throw new Error(error.message || "Erro ao cancelar agendamento");
  }

  const data = await res.json();
  return data.appointment;
}

export function useServices(barberId?: string) {
  return useQuery({
    queryKey: ["services", barberId],
    queryFn: () => fetchServices(barberId),
  });
}

export function useSlots(
  date: string | null,
  barberId: string | null,
  serviceId: string | null,
) {
  return useQuery({
    queryKey: ["slots", date, barberId, serviceId],
    queryFn: () =>
      fetchSlots(date as string, barberId as string, serviceId as string),
    enabled: !!date && !!barberId && !!serviceId,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      // Use exact: false to invalidate all appointment-related queries
      // e.g., ["appointments", "client"], ["appointments", "barber", ...]
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useCreateGuestAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGuestAppointment,
    onSuccess: (data) => {
      // Save the access token to localStorage for future lookups/cancellations
      setGuestToken(data.accessToken);

      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useClientAppointments() {
  return useQuery({
    queryKey: ["appointments", "client"],
    queryFn: fetchClientAppointments,
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      reason,
    }: {
      appointmentId: string;
      reason?: string;
    }) => cancelAppointment(appointmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

async function fetchBarberAppointments(
  barberId: string,
  startDate: string,
  endDate: string,
): Promise<AppointmentWithDetails[]> {
  const res = await fetch(
    `/api/appointments?barberId=${barberId}&startDate=${startDate}&endDate=${endDate}`,
  );
  if (!res.ok) throw new Error("Erro ao carregar agendamentos");
  const data = await res.json();
  return data.appointments;
}

async function cancelAppointmentByBarber(
  appointmentId: string,
  reason: string,
): Promise<AppointmentWithDetails> {
  const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Erro ao cancelar agendamento");
  }

  const data = await res.json();
  return data.appointment;
}

export function useBarberAppointments(
  barberId: string | null,
  startDate: Date | null,
  endDate: Date | null,
) {
  return useQuery({
    queryKey: [
      "appointments",
      "barber",
      barberId,
      startDate ? formatDateToString(startDate) : null,
      endDate ? formatDateToString(endDate) : null,
    ],
    queryFn: () =>
      fetchBarberAppointments(
        barberId as string,
        formatDateToString(startDate as Date),
        formatDateToString(endDate as Date),
      ),
    enabled: !!barberId && !!startDate && !!endDate,
  });
}

export function useCancelAppointmentByBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      reason,
    }: {
      appointmentId: string;
      reason: string;
    }) => cancelAppointmentByBarber(appointmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

async function markAppointmentNoShow(
  appointmentId: string,
): Promise<AppointmentWithDetails> {
  const res = await fetch(`/api/appointments/${appointmentId}/no-show`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.error === "PRECONDITION_FAILED") {
      throw new Error(
        "Só é possível marcar ausência após o horário do agendamento.",
      );
    }
    if (error.error === "CONFLICT") {
      throw new Error("Este agendamento não pode ser marcado como ausência.");
    }
    throw new Error(error.message || "Erro ao marcar ausência");
  }

  const data = await res.json();
  return data.appointment;
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId }: { appointmentId: string }) =>
      markAppointmentNoShow(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
    },
  });
}

// ============================================
// Barber Create Appointment Hooks
// ============================================

interface CreateAppointmentByBarberInput {
  serviceId: string;
  date: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
}

async function createAppointmentByBarber(
  input: CreateAppointmentByBarberInput,
): Promise<AppointmentWithDetails> {
  const res = await fetch("/api/barbers/me/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.error === "SLOT_IN_PAST") {
      throw new Error(
        "Este horário já passou. Por favor, escolha outro horário.",
      );
    }
    if (error.error === "SHOP_CLOSED") {
      throw new Error(
        "A barbearia não atende neste horário. Por favor, escolha outro.",
      );
    }
    if (error.error === "BARBER_UNAVAILABLE") {
      throw new Error(
        "Você não atende neste horário. Por favor, escolha outro.",
      );
    }
    if (error.error === "SLOT_UNAVAILABLE") {
      throw new Error(
        "Este horário não está disponível. Por favor, escolha outro.",
      );
    }
    if (error.error === "SLOT_OCCUPIED") {
      throw new Error(
        "Este horário já foi reservado. Por favor, escolha outro.",
      );
    }
    throw new Error(error.message || "Erro ao criar agendamento");
  }

  const data = await res.json();
  return data.appointment;
}

export function useCreateAppointmentByBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAppointmentByBarber,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
    },
  });
}

// ============================================
// Guest Appointment Hooks (Token-based)
// ============================================

async function fetchGuestAppointmentsByToken(
  accessToken: string,
): Promise<AppointmentWithDetails[]> {
  const res = await fetch("/api/appointments/guest/lookup", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Guest-Token": accessToken,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Token not found or invalid
      return [];
    }
    throw new Error("Erro ao buscar agendamentos");
  }
  const data = await res.json();
  return data.appointments;
}

async function cancelGuestAppointmentByToken(
  appointmentId: string,
  accessToken: string,
): Promise<AppointmentWithDetails> {
  const res = await fetch(`/api/appointments/guest/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Guest-Token": accessToken,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.error === "APPOINTMENT_IN_PAST") {
      throw new Error("Este agendamento já passou e não pode ser cancelado.");
    }
    if (error.error === "UNAUTHORIZED") {
      throw new Error("Você não tem permissão para cancelar este agendamento.");
    }
    if (error.error === "MISSING_TOKEN") {
      throw new Error("Sessão expirada. Por favor, faça um novo agendamento.");
    }
    throw new Error(error.message || "Erro ao cancelar agendamento");
  }

  const data = await res.json();
  return data.appointment;
}

/**
 * Hook to fetch guest appointments using the token from localStorage
 * Automatically reads the token - no need to pass phone number
 */
export function useGuestAppointments() {
  const token = getGuestToken();

  return useQuery({
    queryKey: ["appointments", "guest", token],
    queryFn: () => fetchGuestAppointmentsByToken(token as string),
    enabled: !!token,
  });
}

/**
 * Hook to cancel a guest appointment using the token from localStorage
 */
export function useCancelGuestAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId }: { appointmentId: string }) => {
      const token = getGuestToken();
      if (!token) {
        throw new Error(
          "Sessão expirada. Por favor, faça um novo agendamento.",
        );
      }
      return cancelGuestAppointmentByToken(appointmentId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}
