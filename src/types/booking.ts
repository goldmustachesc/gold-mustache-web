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

export interface CreateAppointmentByBarberInput {
  serviceId: string;
  date: string; // "2025-12-15"
  startTime: string; // "10:30"
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

/**
 * Barber data returned by public API (without sensitive fields)
 */
export interface BarberData {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Full barber data (used internally/admin)
 */
export interface BarberFullData extends BarberData {
  userId: string;
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
// Barber Absence Types
// ============================================

export interface BarberAbsenceData {
  id: string;
  barberId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string | null; // null => all day
  endTime: string | null; // null => all day
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Shop Hours / Closures Types
// ============================================

export interface ShopHoursData {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopClosureData {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
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
