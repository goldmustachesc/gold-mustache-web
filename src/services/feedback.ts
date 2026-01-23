import { prisma } from "@/lib/prisma";
import {
  formatPrismaDateToString,
  getMinutesUntilAppointment,
} from "@/utils/time-slots";
import type {
  FeedbackWithDetails,
  FeedbackStats,
  BarberRanking,
  CreateFeedbackInput,
  FeedbackFilters,
  PaginatedFeedbacks,
} from "@/types/feedback";
import { AppointmentStatus } from "@prisma/client";

/**
 * Check if an appointment is eligible for feedback.
 * Eligible if: COMPLETED, or CONFIRMED but already past (presume it happened)
 */
function isAppointmentEligibleForFeedback(
  status: AppointmentStatus,
  date: Date,
  startTime: string,
): boolean {
  if (status === AppointmentStatus.COMPLETED) {
    return true;
  }

  // For CONFIRMED appointments, check if the time has already passed
  if (status === AppointmentStatus.CONFIRMED) {
    const dateStr = formatPrismaDateToString(date);
    const minutesUntil = getMinutesUntilAppointment(dateStr, startTime);
    return minutesUntil <= 0; // Already past
  }

  return false;
}

// ============================================
// Helper Functions
// ============================================

function mapFeedbackToDetails(feedback: {
  id: string;
  appointmentId: string;
  barberId: string;
  clientId: string | null;
  guestClientId: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
  appointment: {
    id: string;
    date: Date;
    startTime: string;
    service: {
      id: string;
      name: string;
    };
  };
  barber: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  client: {
    id: string;
    fullName: string | null;
  } | null;
  guestClient: {
    id: string;
    fullName: string;
  } | null;
}): FeedbackWithDetails {
  return {
    id: feedback.id,
    appointmentId: feedback.appointmentId,
    barberId: feedback.barberId,
    clientId: feedback.clientId,
    guestClientId: feedback.guestClientId,
    rating: feedback.rating,
    comment: feedback.comment,
    createdAt: feedback.createdAt.toISOString(),
    appointment: {
      id: feedback.appointment.id,
      date: formatPrismaDateToString(feedback.appointment.date),
      startTime: feedback.appointment.startTime,
      service: feedback.appointment.service,
    },
    barber: feedback.barber,
    client: feedback.client,
    guestClient: feedback.guestClient,
  };
}

function calculateStats(feedbacks: { rating: number }[]): FeedbackStats {
  const total = feedbacks.length;

  if (total === 0) {
    return {
      totalFeedbacks: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const f of feedbacks) {
    distribution[f.rating as keyof typeof distribution]++;
  }

  return {
    totalFeedbacks: total,
    averageRating: Math.round((sum / total) * 10) / 10, // 1 casa decimal
    ratingDistribution: distribution,
  };
}

// ============================================
// Client Functions
// ============================================

/**
 * Create feedback for a completed appointment (authenticated client)
 */
export async function createFeedback(
  input: CreateFeedbackInput,
  clientId: string,
): Promise<FeedbackWithDetails> {
  const { appointmentId, rating, comment } = input;

  // Validate rating
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error("INVALID_RATING");
  }

  // Get appointment and validate
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      feedback: true,
    },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  // Check ownership
  if (appointment.clientId !== clientId) {
    throw new Error("UNAUTHORIZED");
  }

  // Check if appointment is eligible for feedback (COMPLETED or CONFIRMED past)
  if (
    !isAppointmentEligibleForFeedback(
      appointment.status,
      appointment.date,
      appointment.startTime,
    )
  ) {
    throw new Error("APPOINTMENT_NOT_COMPLETED");
  }

  // Check if already has feedback
  if (appointment.feedback) {
    throw new Error("FEEDBACK_ALREADY_EXISTS");
  }

  // Create feedback (and optionally mark as completed if it was CONFIRMED)
  const feedback = await prisma.feedback.create({
    data: {
      appointmentId,
      barberId: appointment.barberId,
      clientId,
      rating,
      comment: comment?.trim() || null,
    },
    include: {
      appointment: {
        select: {
          id: true,
          date: true,
          startTime: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      client: {
        select: {
          id: true,
          fullName: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  return mapFeedbackToDetails(feedback);
}

/**
 * Create feedback for a completed appointment (guest client via token)
 */
export async function createGuestFeedback(
  input: CreateFeedbackInput,
  accessToken: string,
): Promise<FeedbackWithDetails> {
  const { appointmentId, rating, comment } = input;

  // Validate rating
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error("INVALID_RATING");
  }

  // Find guest by token
  const guestClient = await prisma.guestClient.findUnique({
    where: { accessToken },
  });

  if (!guestClient) {
    throw new Error("GUEST_NOT_FOUND");
  }

  // Get appointment and validate
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      feedback: true,
    },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  // Check ownership
  if (appointment.guestClientId !== guestClient.id) {
    throw new Error("UNAUTHORIZED");
  }

  // Check if appointment is eligible for feedback (COMPLETED or CONFIRMED past)
  if (
    !isAppointmentEligibleForFeedback(
      appointment.status,
      appointment.date,
      appointment.startTime,
    )
  ) {
    throw new Error("APPOINTMENT_NOT_COMPLETED");
  }

  // Check if already has feedback
  if (appointment.feedback) {
    throw new Error("FEEDBACK_ALREADY_EXISTS");
  }

  // Create feedback
  const feedback = await prisma.feedback.create({
    data: {
      appointmentId,
      barberId: appointment.barberId,
      guestClientId: guestClient.id,
      rating,
      comment: comment?.trim() || null,
    },
    include: {
      appointment: {
        select: {
          id: true,
          date: true,
          startTime: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      client: {
        select: {
          id: true,
          fullName: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  return mapFeedbackToDetails(feedback);
}

/**
 * Check if an appointment has feedback
 */
export async function getAppointmentFeedback(
  appointmentId: string,
): Promise<FeedbackWithDetails | null> {
  const feedback = await prisma.feedback.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        select: {
          id: true,
          date: true,
          startTime: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      client: {
        select: {
          id: true,
          fullName: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  if (!feedback) {
    return null;
  }

  return mapFeedbackToDetails(feedback);
}

// ============================================
// Barber Functions
// ============================================

/**
 * Get all feedbacks for a barber
 */
export async function getBarberFeedbacks(
  barberId: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedFeedbacks> {
  const skip = (page - 1) * pageSize;

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where: { barberId },
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        barber: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        client: {
          select: {
            id: true,
            fullName: true,
          },
        },
        guestClient: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.feedback.count({ where: { barberId } }),
  ]);

  return {
    feedbacks: feedbacks.map(mapFeedbackToDetails),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get feedback stats for a barber
 */
export async function getBarberFeedbackStats(
  barberId: string,
): Promise<FeedbackStats> {
  const feedbacks = await prisma.feedback.findMany({
    where: { barberId },
    select: { rating: true },
  });

  return calculateStats(feedbacks);
}

// ============================================
// Admin Functions
// ============================================

/**
 * Get all feedbacks with filters (admin)
 */
export async function getAllFeedbacks(
  filters: FeedbackFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedFeedbacks> {
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: {
    barberId?: string;
    rating?: number;
    createdAt?: { gte?: Date; lte?: Date };
    comment?: { not: null } | null;
  } = {};

  if (filters.barberId) {
    where.barberId = filters.barberId;
  }

  if (filters.rating) {
    where.rating = filters.rating;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  if (filters.hasComment !== undefined) {
    where.comment = filters.hasComment ? { not: null } : null;
  }

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        barber: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        client: {
          select: {
            id: true,
            fullName: true,
          },
        },
        guestClient: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.feedback.count({ where }),
  ]);

  return {
    feedbacks: feedbacks.map(mapFeedbackToDetails),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get overall feedback stats (admin)
 */
export async function getOverallFeedbackStats(): Promise<FeedbackStats> {
  const feedbacks = await prisma.feedback.findMany({
    select: { rating: true },
  });

  return calculateStats(feedbacks);
}

/**
 * Get barber ranking by average rating
 */
export async function getBarberRanking(): Promise<BarberRanking[]> {
  // Get all barbers with their feedbacks
  const barbers = await prisma.barber.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      feedbacks: {
        select: { rating: true },
      },
    },
  });

  // Calculate ranking
  const ranking = barbers
    .map((barber) => {
      const total = barber.feedbacks.length;
      const sum = barber.feedbacks.reduce((acc, f) => acc + f.rating, 0);
      const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

      return {
        barberId: barber.id,
        barberName: barber.name,
        avatarUrl: barber.avatarUrl,
        averageRating: average,
        totalFeedbacks: total,
      };
    })
    .sort((a, b) => {
      // Sort by average rating (desc), then by total feedbacks (desc)
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }
      return b.totalFeedbacks - a.totalFeedbacks;
    });

  return ranking;
}

/**
 * Get feedbacks for a specific barber (admin view)
 */
export async function getBarberFeedbacksAdmin(
  barberId: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedFeedbacks> {
  return getBarberFeedbacks(barberId, page, pageSize);
}
