"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  FeedbackWithDetails,
  FeedbackStats,
  PaginatedFeedbacks,
  FeedbackFilters,
  BarberRanking,
} from "@/types/feedback";

// ============================================
// Types
// ============================================

interface CreateFeedbackInput {
  appointmentId: string;
  rating: number;
  comment?: string;
}

// ============================================
// API Functions
// ============================================

const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

// Client: Create feedback
async function createFeedback(
  input: CreateFeedbackInput,
): Promise<FeedbackWithDetails> {
  const res = await fetch(
    `${baseUrl}/api/appointments/${input.appointmentId}/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: input.rating, comment: input.comment }),
    },
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao enviar avaliação");
  }

  const data = await res.json();
  return data.feedback;
}

// Client: Get feedback for appointment
async function getAppointmentFeedback(
  appointmentId: string,
): Promise<FeedbackWithDetails | null> {
  const res = await fetch(
    `${baseUrl}/api/appointments/${appointmentId}/feedback`,
  );

  if (!res.ok) {
    throw new Error("Erro ao buscar avaliação");
  }

  const data = await res.json();
  return data.feedback;
}

// Guest: Create feedback
async function createGuestFeedback(
  input: CreateFeedbackInput,
  accessToken: string,
): Promise<FeedbackWithDetails> {
  const res = await fetch(
    `${baseUrl}/api/appointments/guest/${input.appointmentId}/feedback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-token": accessToken,
      },
      body: JSON.stringify({ rating: input.rating, comment: input.comment }),
    },
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erro ao enviar avaliação");
  }

  const data = await res.json();
  return data.feedback;
}

// Barber: Get feedbacks
async function getBarberFeedbacks(
  page = 1,
  pageSize = 10,
): Promise<PaginatedFeedbacks> {
  const res = await fetch(
    `${baseUrl}/api/barbers/me/feedbacks?page=${page}&pageSize=${pageSize}`,
  );

  if (!res.ok) {
    throw new Error("Erro ao buscar avaliações");
  }

  return res.json();
}

// Barber: Get stats
async function getBarberFeedbackStats(): Promise<FeedbackStats> {
  const res = await fetch(`${baseUrl}/api/barbers/me/feedbacks/stats`);

  if (!res.ok) {
    throw new Error("Erro ao buscar estatísticas");
  }

  const data = await res.json();
  return data.stats;
}

// Admin: Get all feedbacks
async function getAdminFeedbacks(
  filters: FeedbackFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedFeedbacks> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  if (filters.barberId) params.set("barberId", filters.barberId);
  if (filters.rating) params.set("rating", filters.rating.toString());
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.hasComment !== undefined) {
    params.set("hasComment", filters.hasComment.toString());
  }

  const res = await fetch(`${baseUrl}/api/admin/feedbacks?${params}`);

  if (!res.ok) {
    throw new Error("Erro ao buscar avaliações");
  }

  return res.json();
}

// Admin: Get overall stats
async function getAdminFeedbackStats(): Promise<FeedbackStats> {
  const res = await fetch(`${baseUrl}/api/admin/feedbacks/stats`);

  if (!res.ok) {
    throw new Error("Erro ao buscar estatísticas");
  }

  const data = await res.json();
  return data.stats;
}

// Admin: Get barber ranking
async function getBarberRanking(): Promise<BarberRanking[]> {
  const res = await fetch(`${baseUrl}/api/admin/barbers/ranking`);

  if (!res.ok) {
    throw new Error("Erro ao buscar ranking");
  }

  const data = await res.json();
  return data.ranking;
}

// Admin: Get feedbacks for specific barber
async function getAdminBarberFeedbacks(
  barberId: string,
  page = 1,
  pageSize = 20,
  includeStats = false,
): Promise<
  PaginatedFeedbacks & {
    barber?: { id: string; name: string };
    stats?: FeedbackStats;
  }
> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  if (includeStats) params.set("includeStats", "true");

  const res = await fetch(
    `${baseUrl}/api/admin/barbers/${barberId}/feedbacks?${params}`,
  );

  if (!res.ok) {
    throw new Error("Erro ao buscar avaliações do barbeiro");
  }

  return res.json();
}

// ============================================
// Client Hooks
// ============================================

/**
 * Hook for creating feedback (authenticated client)
 */
export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFeedback,
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["appointment-feedback", variables.appointmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["client-appointments"] });
    },
  });
}

/**
 * Hook for getting feedback for an appointment
 */
export function useAppointmentFeedback(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ["appointment-feedback", appointmentId],
    queryFn: () => getAppointmentFeedback(appointmentId as string),
    enabled: !!appointmentId,
  });
}

/**
 * Hook for creating guest feedback
 */
export function useCreateGuestFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      accessToken,
    }: {
      input: CreateFeedbackInput;
      accessToken: string;
    }) => createGuestFeedback(input, accessToken),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["appointment-feedback", variables.input.appointmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["guest-appointments"] });
    },
  });
}

// ============================================
// Barber Hooks
// ============================================

/**
 * Hook for barber to get their feedbacks
 */
export function useBarberFeedbacks(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["barber-feedbacks", page, pageSize],
    queryFn: () => getBarberFeedbacks(page, pageSize),
  });
}

/**
 * Hook for barber to get their stats
 */
export function useBarberFeedbackStats() {
  return useQuery({
    queryKey: ["barber-feedback-stats"],
    queryFn: getBarberFeedbackStats,
  });
}

// ============================================
// Admin Hooks
// ============================================

/**
 * Hook for admin to get all feedbacks
 */
export function useAdminFeedbacks(
  filters: FeedbackFilters = {},
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: ["admin-feedbacks", filters, page, pageSize],
    queryFn: () => getAdminFeedbacks(filters, page, pageSize),
  });
}

/**
 * Hook for admin to get overall stats
 */
export function useAdminFeedbackStats() {
  return useQuery({
    queryKey: ["admin-feedback-stats"],
    queryFn: getAdminFeedbackStats,
  });
}

/**
 * Hook for admin to get barber ranking
 */
export function useBarberRanking() {
  return useQuery({
    queryKey: ["barber-ranking"],
    queryFn: getBarberRanking,
  });
}

/**
 * Hook for admin to get feedbacks for a specific barber
 */
export function useAdminBarberFeedbacks(
  barberId: string | undefined,
  page = 1,
  pageSize = 20,
  includeStats = false,
) {
  return useQuery({
    queryKey: [
      "admin-barber-feedbacks",
      barberId,
      page,
      pageSize,
      includeStats,
    ],
    queryFn: () =>
      getAdminBarberFeedbacks(barberId as string, page, pageSize, includeStats),
    enabled: !!barberId,
  });
}
