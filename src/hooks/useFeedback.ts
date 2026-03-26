"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  FeedbackWithDetails,
  FeedbackStats,
  PaginatedFeedbacks,
  FeedbackFilters,
  BarberRanking,
} from "@/types/feedback";
import { apiGet, apiMutate } from "@/lib/api/client";

// ============================================
// Types
// ============================================

interface CreateFeedbackInput {
  appointmentId: string;
  rating: number;
  comment?: string;
}

// ============================================
// Client Hooks
// ============================================

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFeedbackInput) =>
      apiMutate<FeedbackWithDetails>(
        `/api/appointments/${input.appointmentId}/feedback`,
        "POST",
        { rating: input.rating, comment: input.comment },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["appointment-feedback", variables.appointmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["client-appointments"] });
    },
  });
}

export function useAppointmentFeedback(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ["appointment-feedback", appointmentId],
    queryFn: () =>
      apiGet<FeedbackWithDetails | null>(
        `/api/appointments/${appointmentId}/feedback`,
      ),
    enabled: !!appointmentId,
  });
}

export function useCreateGuestFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      accessToken,
    }: {
      input: CreateFeedbackInput;
      accessToken: string;
    }) =>
      apiMutate<FeedbackWithDetails>(
        `/api/appointments/guest/${input.appointmentId}/feedback`,
        "POST",
        { rating: input.rating, comment: input.comment },
        { "X-Guest-Token": accessToken },
      ),
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

export function useBarberFeedbacks(page = 1, limit = 10) {
  return useQuery({
    queryKey: ["barber-feedbacks", page, limit],
    queryFn: () =>
      apiGet<PaginatedFeedbacks>(
        `/api/barbers/me/feedbacks?page=${page}&limit=${limit}`,
      ),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBarberFeedbackStats() {
  return useQuery({
    queryKey: ["barber-feedback-stats"],
    queryFn: () => apiGet<FeedbackStats>("/api/barbers/me/feedbacks/stats"),
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// Admin Hooks
// ============================================

export function useAdminFeedbacks(
  filters: FeedbackFilters = {},
  page = 1,
  limit = 20,
) {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());
  if (filters.barberId) params.set("barberId", filters.barberId);
  if (filters.rating) params.set("rating", filters.rating.toString());
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.hasComment !== undefined) {
    params.set("hasComment", filters.hasComment.toString());
  }

  return useQuery({
    queryKey: ["admin-feedbacks", filters, page, limit],
    queryFn: () => apiGet<PaginatedFeedbacks>(`/api/admin/feedbacks?${params}`),
    staleTime: 60 * 1000,
  });
}

export function useAdminFeedbackStats() {
  return useQuery({
    queryKey: ["admin-feedback-stats"],
    queryFn: () => apiGet<FeedbackStats>("/api/admin/feedbacks/stats"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBarberRanking() {
  return useQuery({
    queryKey: ["barber-ranking"],
    queryFn: () => apiGet<BarberRanking[]>("/api/admin/barbers/ranking"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminBarberFeedbacks(
  barberId: string | undefined,
  page = 1,
  limit = 20,
  includeStats = false,
) {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());
  if (includeStats) params.set("includeStats", "true");

  return useQuery({
    queryKey: ["admin-barber-feedbacks", barberId, page, limit, includeStats],
    queryFn: () =>
      apiGet<
        PaginatedFeedbacks & {
          barber?: { id: string; name: string };
          stats?: FeedbackStats;
        }
      >(`/api/admin/barbers/${barberId}/feedbacks?${params}`),
    enabled: !!barberId,
  });
}
