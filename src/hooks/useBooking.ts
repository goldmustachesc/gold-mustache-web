"use client";

import type {
  ServiceData,
  BookingAvailability,
  CreateAppointmentInput,
  CreateGuestAppointmentInput,
  AppointmentWithDetails,
  BarberData,
} from "@/types/booking";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateToString } from "@/utils/time-slots";
import {
  clearGuestToken,
  getGuestToken,
  setGuestToken,
} from "@/lib/guest-session";
import { apiGet, apiMutate, ApiError } from "@/lib/api/client";

const SLOT_ERROR_MESSAGES: Record<string, string> = {
  SLOT_IN_PAST: "Este horário já passou. Por favor, escolha outro horário.",
  SLOT_TOO_SOON:
    "Agendamento deve ser feito com pelo menos 60 minutos de antecedência.",
  SHOP_CLOSED:
    "A barbearia não atende neste horário. Por favor, escolha outro.",
  BARBER_UNAVAILABLE:
    "Este barbeiro não atende neste horário. Por favor, escolha outro.",
  SLOT_UNAVAILABLE:
    "Este horário não está disponível. Por favor, escolha outro.",
  SLOT_OCCUPIED: "Este horário já foi reservado. Por favor, escolha outro.",
  CLIENT_OVERLAPPING_APPOINTMENT:
    "Você já possui um agendamento neste horário. Escolha outro horário.",
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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["services", barberId],
    queryFn: () =>
      apiGet<ServiceData[]>(
        barberId ? `/api/services?barberId=${barberId}` : "/api/services",
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: () => {
      if (!barberId) return undefined;
      const cached = queryClient.getQueryData<ServiceData[]>([
        "services",
        undefined,
      ]);
      if (!cached?.length || cached[0]?.price === undefined) return undefined;
      return cached;
    },
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
      apiGet<BookingAvailability>(
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
      apiGet<BookingAvailability>(
        `/api/barbers/me/slots?date=${date}&barberId=${barberId}&serviceId=${serviceId}`,
      ),
    enabled: !!date && !!barberId && !!serviceId,
  });
}

// ============================================
// Client Appointment Hooks
// ============================================

export function useClientAppointments(enabled = true) {
  return useQuery({
    queryKey: ["appointments", "client"],
    queryFn: () => apiGet<AppointmentWithDetails[]>("/api/appointments"),
    staleTime: 30 * 1000,
    enabled,
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
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      try {
        return await apiMutate<AppointmentWithDetails>(
          `/api/appointments/${appointmentId}/cancel`,
          "PATCH",
          { actor: "client" },
        );
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "APPOINTMENT_IN_PAST") {
            throw new Error(
              "Este agendamento já passou e não pode ser cancelado.",
            );
          }
          if (error.code === "CANCELLATION_BLOCKED") {
            throw new Error("CANCELLATION_BLOCKED");
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
      queryClient.invalidateQueries({ queryKey: ["cancelled-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
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
    placeholderData: (previousData) => previousData,
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
        { actor: "barber", reason },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["slots"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["cancelled-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["loyalty"], exact: false });
    },
  });
}

export function useMarkCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      try {
        return await apiMutate<AppointmentWithDetails>(
          `/api/appointments/${appointmentId}/complete`,
          "PATCH",
        );
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "PRECONDITION_FAILED") {
            throw new Error(
              "Só é possível concluir após o horário do agendamento.",
            );
          }
          if (error.code === "CONFLICT") {
            throw new Error("Este agendamento não pode ser concluído.");
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["loyalty"], exact: false });
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
    if (error instanceof ApiError && error.status === 401) {
      clearGuestToken();
      return [];
    }
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

interface ClaimGuestAppointmentsResponse {
  linked: boolean;
  appointmentsTransferred: number;
  guestClientClaimed: boolean;
  banMigrated: boolean;
  alreadyClaimed: boolean;
}

export function useClaimGuestAppointments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = getGuestToken();
      if (!token) {
        throw new Error(
          "Nenhum histórico guest foi encontrado neste dispositivo.",
        );
      }

      try {
        return await apiMutate<ClaimGuestAppointmentsResponse>(
          "/api/appointments/guest/claim",
          "POST",
          undefined,
          { "X-Guest-Token": token },
        );
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "GUEST_NOT_FOUND") {
            clearGuestToken();
            throw new Error(
              "Nenhum histórico guest válido foi encontrado neste dispositivo.",
            );
          }
          if (error.code === "GUEST_ALREADY_CLAIMED") {
            clearGuestToken();
            throw new Error(
              "Este histórico guest já foi vinculado a outra conta.",
            );
          }
          if (error.code === "MISSING_TOKEN") {
            clearGuestToken();
            throw new Error("Sessão guest indisponível neste dispositivo.");
          }
        }

        throw error;
      }
    },
    onSuccess: () => {
      clearGuestToken();
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["cancelled-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty"], exact: false });
    },
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
            clearGuestToken();
            throw new Error(
              "Sessão expirada. Por favor, faça um novo agendamento.",
            );
          }
          if (error.code === "GUEST_TOKEN_CONSUMED") {
            clearGuestToken();
            throw new Error(
              "Sessão expirada. Por favor, faça um novo agendamento.",
            );
          }
          if (error.code === "CANCELLATION_BLOCKED") {
            throw new Error("CANCELLATION_BLOCKED");
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
      queryClient.invalidateQueries({ queryKey: ["cancelled-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
    },
  });
}
