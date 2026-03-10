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
import { apiGet, apiMutate, ApiError } from "@/lib/api/client";

const SLOT_ERROR_MESSAGES: Record<string, string> = {
  SLOT_IN_PAST: "Este horário já passou. Por favor, escolha outro horário.",
  SLOT_TOO_SOON:
    "Agendamento deve ser feito com pelo menos 1 hora de antecedência.",
  SHOP_CLOSED:
    "A barbearia não atende neste horário. Por favor, escolha outro.",
  BARBER_UNAVAILABLE:
    "Este barbeiro não atende neste horário. Por favor, escolha outro.",
  SLOT_UNAVAILABLE:
    "Este horário não está disponível. Por favor, escolha outro.",
  SLOT_OCCUPIED: "Este horário já foi reservado. Por favor, escolha outro.",
  BOOKING_DISABLED: "Agendamento online indisponível no momento.",
};

const BARBER_SLOT_ERROR_MESSAGES: Record<string, string> = {
  ...SLOT_ERROR_MESSAGES,
  BARBER_UNAVAILABLE:
    "Você não atende neste horário. Por favor, escolha outro.",
};

function translateSlotError(
  error: ApiError,
  errorMap = SLOT_ERROR_MESSAGES,
): Error {
  return new Error(errorMap[error.code] ?? error.message);
}

// ============================================
// Public Queries
// ============================================

export function useBarbers() {
  return useQuery({
    queryKey: ["barbers"],
    queryFn: () => apiGet<BarberData[]>("/api/barbers"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useServices(barberId?: string) {
  return useQuery({
    queryKey: ["services", barberId],
    queryFn: () =>
      apiGet<ServiceData[]>(
        barberId ? `/api/services?barberId=${barberId}` : "/api/services",
      ),
    staleTime: 5 * 60 * 1000,
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
      apiGet<TimeSlot[]>(
        `/api/slots?date=${date}&barberId=${barberId}&serviceId=${serviceId}`,
      ),
    enabled: !!date && !!barberId && !!serviceId,
  });
}

export function useBarberSlots(
  date: string | null,
  barberId: string | null,
  serviceId: string | null,
) {
  return useQuery({
    queryKey: ["barberSlots", date, barberId, serviceId],
    queryFn: () =>
      apiGet<TimeSlot[]>(
        `/api/barbers/me/slots?date=${date}&barberId=${barberId}&serviceId=${serviceId}`,
      ),
    enabled: !!date && !!barberId && !!serviceId,
  });
}

// ============================================
// Client Appointment Hooks
// ============================================

export function useClientAppointments() {
  return useQuery({
    queryKey: ["appointments", "client"],
    queryFn: () => apiGet<AppointmentWithDetails[]>("/api/appointments"),
    staleTime: 30 * 1000,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      try {
        return await apiMutate<AppointmentWithDetails>(
          "/api/appointments",
          "POST",
          input,
        );
      } catch (error) {
        if (error instanceof ApiError) throw translateSlotError(error);
        throw error;
      }
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

interface GuestAppointmentResponse {
  appointment: AppointmentWithDetails;
  accessToken: string;
}

export function useCreateGuestAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGuestAppointmentInput) => {
      try {
        return await apiMutate<GuestAppointmentResponse>(
          "/api/appointments/guest",
          "POST",
          input,
        );
      } catch (error) {
        if (error instanceof ApiError) throw translateSlotError(error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setGuestToken(data.accessToken);

      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      reason,
    }: {
      appointmentId: string;
      reason?: string;
    }) => {
      try {
        return await apiMutate<AppointmentWithDetails>(
          `/api/appointments/${appointmentId}/cancel`,
          "PATCH",
          { reason },
        );
      } catch (error) {
        if (error instanceof ApiError && error.code === "APPOINTMENT_IN_PAST") {
          throw new Error(
            "Este agendamento já passou e não pode ser cancelado.",
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["cancelled-appointments"] });
    },
  });
}

// ============================================
// Barber Appointment Hooks
// ============================================

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
      apiGet<AppointmentWithDetails[]>(
        `/api/appointments?barberId=${barberId}&startDate=${formatDateToString(startDate as Date)}&endDate=${formatDateToString(endDate as Date)}`,
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
    }) =>
      apiMutate<AppointmentWithDetails>(
        `/api/appointments/${appointmentId}/cancel`,
        "PATCH",
        { reason },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["cancelled-appointments"] });
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      try {
        return await apiMutate<AppointmentWithDetails>(
          `/api/appointments/${appointmentId}/no-show`,
          "PATCH",
        );
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "PRECONDITION_FAILED") {
            throw new Error(
              "Só é possível marcar ausência após o horário do agendamento.",
            );
          }
          if (error.code === "CONFLICT") {
            throw new Error(
              "Este agendamento não pode ser marcado como ausência.",
            );
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
    },
  });
}

interface CreateAppointmentByBarberInput {
  serviceId: string;
  date: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
}

export function useCreateAppointmentByBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAppointmentByBarberInput) => {
      try {
        return await apiMutate<AppointmentWithDetails>(
          "/api/barbers/me/appointments",
          "POST",
          input,
        );
      } catch (error) {
        if (error instanceof ApiError)
          throw translateSlotError(error, BARBER_SLOT_ERROR_MESSAGES);
        throw error;
      }
    },
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
  try {
    return await apiGet<AppointmentWithDetails[]>(
      "/api/appointments/guest/lookup",
      { "X-Guest-Token": accessToken },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return [];
    throw error;
  }
}

export function useGuestAppointments() {
  const token = getGuestToken();

  return useQuery({
    queryKey: ["appointments", "guest", token],
    queryFn: () => fetchGuestAppointmentsByToken(token as string),
    enabled: !!token,
  });
}

export function useCancelGuestAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      const token = getGuestToken();
      if (!token) {
        throw new Error(
          "Sessão expirada. Por favor, faça um novo agendamento.",
        );
      }

      try {
        return await apiMutate<AppointmentWithDetails>(
          `/api/appointments/guest/${appointmentId}/cancel`,
          "PATCH",
          undefined,
          { "X-Guest-Token": token },
        );
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "APPOINTMENT_IN_PAST") {
            throw new Error(
              "Este agendamento já passou e não pode ser cancelado.",
            );
          }
          if (error.code === "UNAUTHORIZED") {
            throw new Error(
              "Você não tem permissão para cancelar este agendamento.",
            );
          }
          if (error.code === "MISSING_TOKEN") {
            throw new Error(
              "Sessão expirada. Por favor, faça um novo agendamento.",
            );
          }
        }
        throw error;
      }
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
