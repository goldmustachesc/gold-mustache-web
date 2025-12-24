import { prisma } from "@/lib/prisma";
import type { NotificationData } from "@/types/booking";
import { NotificationType } from "@prisma/client";

// ============================================
// Notification Functions
// ============================================

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, string | number | boolean>;
}

/**
 * Create a new notification
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationData> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data as object | undefined,
      read: false,
    },
  });

  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data as Record<string, unknown> | null,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(
  userId: string,
): Promise<NotificationData[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data as Record<string, unknown> | null,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Mark a notification as read
 * Verifies ownership by requiring userId to prevent IDOR
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

// ============================================
// Notification Triggers
// ============================================

/**
 * Send appointment confirmation notification to client
 */
export async function notifyAppointmentConfirmed(
  clientId: string,
  appointmentDetails: {
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
  },
): Promise<NotificationData> {
  return createNotification({
    userId: clientId,
    type: NotificationType.APPOINTMENT_CONFIRMED,
    title: "Agendamento Confirmado",
    message: `Seu agendamento de ${appointmentDetails.serviceName} com ${appointmentDetails.barberName} foi confirmado para ${appointmentDetails.date} às ${appointmentDetails.time}.`,
    data: appointmentDetails,
  });
}

/**
 * Send cancellation notification to client (when barber cancels)
 */
export async function notifyAppointmentCancelledByBarber(
  clientId: string,
  appointmentDetails: {
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    reason: string;
  },
): Promise<NotificationData> {
  return createNotification({
    userId: clientId,
    type: NotificationType.APPOINTMENT_CANCELLED,
    title: "Agendamento Cancelado",
    message: `Seu agendamento de ${appointmentDetails.serviceName} para ${appointmentDetails.date} às ${appointmentDetails.time} foi cancelado pelo barbeiro. Motivo: ${appointmentDetails.reason}`,
    data: appointmentDetails,
  });
}

/**
 * Send cancellation notification to barber (when client cancels)
 */
export async function notifyAppointmentCancelledByClient(
  barberUserId: string,
  appointmentDetails: {
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
  },
): Promise<NotificationData> {
  return createNotification({
    userId: barberUserId,
    type: NotificationType.APPOINTMENT_CANCELLED,
    title: "Agendamento Cancelado",
    message: `O cliente ${appointmentDetails.clientName} cancelou o agendamento de ${appointmentDetails.serviceName} para ${appointmentDetails.date} às ${appointmentDetails.time}.`,
    data: appointmentDetails,
  });
}

/**
 * Send reminder notification to client (24h before appointment)
 */
export async function notifyAppointmentReminder(
  clientId: string,
  appointmentDetails: {
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
  },
): Promise<NotificationData> {
  return createNotification({
    userId: clientId,
    type: NotificationType.APPOINTMENT_REMINDER,
    title: "Lembrete de Agendamento",
    message: `Lembrete: Você tem um agendamento de ${appointmentDetails.serviceName} com ${appointmentDetails.barberName} amanhã às ${appointmentDetails.time}.`,
    data: appointmentDetails,
  });
}
