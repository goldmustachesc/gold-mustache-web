import type { AppointmentStatus, NotificationType } from "@prisma/client";

// ============================================
// Time Slot Types
// ============================================

export interface TimeSlot {
  time: string; // "10:30"
  available: boolean;
  barberId?: string;
}

// ============================================
// Appointment Types
// ============================================

export interface CreateAppointmentInput {
  serviceId: string;
  barberId: string;
  date: string; // "2025-12-15"
  startTime: string; // "10:30"
}

export interface CreateGuestAppointmentInput extends CreateAppointmentInput {
  clientName: string;
  clientPhone: string;
}

export interface GuestClientData {
  id: string;
  fullName: string;
  phone: string;
}

export interface AppointmentData {
  id: string;
  clientId: string | null;
  guestClientId: string | null;
  barberId: string;
  serviceId: string;
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithDetails extends AppointmentData {
  client: {
    id: string;
    fullName: string | null;
    phone: string | null;
  } | null;
  guestClient: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
  barber: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
}

// ============================================
// Service Types
// ============================================

export interface ServiceData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  active: boolean;
}

// ============================================
// Barber Types
// ============================================

export interface BarberData {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  active: boolean;
}

export interface WorkingHoursData {
  id: string;
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

// ============================================
// Notification Types
// ============================================

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

// ============================================
// Query Types
// ============================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CancelAppointmentInput {
  appointmentId: string;
  reason?: string;
  cancelledBy: "client" | "barber";
}
