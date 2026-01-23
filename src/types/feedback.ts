// ============================================
// Feedback Types
// ============================================

export interface FeedbackData {
  id: string;
  appointmentId: string;
  barberId: string;
  clientId: string | null;
  guestClientId: string | null;
  rating: number; // 1 a 5
  comment: string | null;
  createdAt: string;
}

export interface FeedbackWithDetails extends FeedbackData {
  appointment: {
    id: string;
    date: string;
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
}

export interface CreateFeedbackInput {
  appointmentId: string;
  rating: number; // 1 a 5
  comment?: string;
}

// ============================================
// Stats Types
// ============================================

export interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface BarberFeedbackStats extends FeedbackStats {
  barberId: string;
  barberName: string;
}

export interface BarberRanking {
  barberId: string;
  barberName: string;
  avatarUrl: string | null;
  averageRating: number;
  totalFeedbacks: number;
}

// ============================================
// Query/Filter Types
// ============================================

export interface FeedbackFilters {
  barberId?: string;
  rating?: number;
  startDate?: string;
  endDate?: string;
  hasComment?: boolean;
}

export interface PaginatedFeedbacks {
  feedbacks: FeedbackWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
