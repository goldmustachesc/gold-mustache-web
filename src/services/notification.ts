import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { siteConfig } from "@/config/site";
import { getAuthUserEmailsByIds } from "@/lib/supabase/admin";
import type { AppointmentWithDetails, NotificationData } from "@/types/booking";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { NotificationType, type Prisma } from "@prisma/client";
import {
  buildAppointmentConfirmationEmailContent,
  buildAppointmentCancellationEmailContent,
  sendTransactionalEmail,
} from "@/services/transactional-email";

// ============================================
// Helpers
// ============================================

function toInputJson(
  data?: Record<string, string | number | boolean>,
): Prisma.InputJsonValue | undefined {
  if (data === undefined) return undefined;
  const result: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, val] of Object.entries(data)) {
    result[key] = val;
  }
  return result;
}

function toJsonRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}

function buildWhatsAppDeeplink(phone: string, message: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (!normalized.startsWith("55")) {
    normalized = `55${normalized}`;
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function siteUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (base) return base.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "")}`.replace(
      /\/+$/,
      "",
    );
  }

  if (process.env.NODE_ENV === "production") return siteConfig.productionUrl;

  return "http://localhost:3001";
}

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

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationData> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: toInputJson(input.data),
      read: false,
    },
  });

  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: toJsonRecord(notification.data),
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function getNotifications(
  userId: string,
  pagination?: { skip: number; take: number },
): Promise<{ notifications: NotificationData[]; total: number }> {
  const where = { userId };

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    }),
  ]);

  return {
    total,
    notifications: notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: toJsonRecord(n.data),
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

// ============================================
// Notification Triggers
// ============================================

export async function notifyAppointmentConfirmed(
  clientId: string,
  appointmentDetails: {
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    recipientName?: string;
    appointmentId?: string;
  },
): Promise<NotificationData> {
  const notification = await createNotification({
    userId: clientId,
    type: NotificationType.APPOINTMENT_CONFIRMED,
    title: "Agendamento Confirmado",
    message: `Seu agendamento de ${appointmentDetails.serviceName} com ${appointmentDetails.barberName} foi confirmado para ${appointmentDetails.date} às ${appointmentDetails.time}.`,
    data: {
      serviceName: appointmentDetails.serviceName,
      barberName: appointmentDetails.barberName,
      date: appointmentDetails.date,
      time: appointmentDetails.time,
    },
  });

  try {
    await sendTransactionalEmailToUser(clientId, {
      type: "confirmation",
      recipientName: appointmentDetails.recipientName,
      serviceName: appointmentDetails.serviceName,
      barberName: appointmentDetails.barberName,
      date: appointmentDetails.date,
      time: appointmentDetails.time,
      appointmentId: appointmentDetails.appointmentId,
    });
  } catch (error) {
    logger.warn({ error, clientId }, "Email de confirmação não enviado");
  }

  return notification;
}

/**
 * Cria notificação para o barbeiro com deeplink WhatsApp para avisar cliente guest
 * sobre confirmação do agendamento. Barber vê no painel e clica para enviar.
 */
export async function notifyGuestAppointmentConfirmed(
  guestPhone: string,
  guestName: string,
  barberUserId: string,
  appointmentDetails: {
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
  },
): Promise<void> {
  const message =
    `Olá ${guestName}! Seu agendamento na Gold Mustache foi confirmado:\n` +
    `📅 ${appointmentDetails.date} às ${appointmentDetails.time}\n` +
    `✂️ ${appointmentDetails.serviceName} com ${appointmentDetails.barberName}`;

  const whatsappUrl = buildWhatsAppDeeplink(guestPhone, message);
  const firstName = guestName.split(" ")[0];

  await createNotification({
    userId: barberUserId,
    type: NotificationType.APPOINTMENT_CONFIRMED,
    title: "Avisar cliente (WhatsApp)",
    message: `Enviar confirmação para ${firstName} (${appointmentDetails.date} às ${appointmentDetails.time}).`,
    data: { whatsappUrl, guestPhone },
  });
}

export async function notifyAppointmentCancelledByBarber(
  clientId: string,
  appointmentDetails: {
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    reason: string;
    recipientName?: string;
    appointmentId?: string;
  },
): Promise<NotificationData> {
  const notification = await createNotification({
    userId: clientId,
    type: NotificationType.APPOINTMENT_CANCELLED,
    title: "Agendamento Cancelado",
    message: `Seu agendamento de ${appointmentDetails.serviceName} para ${appointmentDetails.date} às ${appointmentDetails.time} foi cancelado pelo barbeiro. Motivo: ${appointmentDetails.reason}`,
    data: {
      serviceName: appointmentDetails.serviceName,
      barberName: appointmentDetails.barberName,
      date: appointmentDetails.date,
      time: appointmentDetails.time,
      reason: appointmentDetails.reason,
    },
  });

  try {
    await sendTransactionalEmailToUser(clientId, {
      type: "cancellation",
      recipientName: appointmentDetails.recipientName,
      serviceName: appointmentDetails.serviceName,
      barberName: appointmentDetails.barberName,
      date: appointmentDetails.date,
      time: appointmentDetails.time,
      reason: appointmentDetails.reason,
      appointmentId: appointmentDetails.appointmentId,
    });
  } catch (error) {
    logger.warn({ error, clientId }, "Email de cancelamento não enviado");
  }

  return notification;
}

/**
 * Cria notificação para o barbeiro com deeplink WhatsApp para avisar cliente guest
 * sobre cancelamento. Barber vê no painel e clica para enviar.
 */
export async function notifyGuestAppointmentCancelledByBarber(
  guestPhone: string,
  guestName: string,
  barberUserId: string,
  appointmentDetails: {
    serviceName: string;
    date: string;
    time: string;
    reason: string;
  },
): Promise<void> {
  const message =
    `Olá ${guestName}, seu agendamento na Gold Mustache foi cancelado.\n` +
    `📅 ${appointmentDetails.date} às ${appointmentDetails.time} — ${appointmentDetails.serviceName}\n` +
    `Motivo: ${appointmentDetails.reason}\n` +
    `Para reagendar acesse: ${siteUrl()}/pt-BR/agendar`;

  const whatsappUrl = buildWhatsAppDeeplink(guestPhone, message);
  const firstName = guestName.split(" ")[0];

  await createNotification({
    userId: barberUserId,
    type: NotificationType.APPOINTMENT_CANCELLED,
    title: "Avisar cliente sobre cancelamento (WhatsApp)",
    message: `Enviar cancelamento para ${firstName} (${appointmentDetails.date} às ${appointmentDetails.time}).`,
    data: { whatsappUrl, guestPhone },
  });
}

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
    data: {
      clientName: appointmentDetails.clientName,
      serviceName: appointmentDetails.serviceName,
      date: appointmentDetails.date,
      time: appointmentDetails.time,
    },
  });
}

/**
 * Notify the barber when a client cancels an appointment (including guest clients).
 */
export async function notifyBarberOfAppointmentCancelledByClient(
  appointment: Pick<
    AppointmentWithDetails,
    "barberId" | "startTime" | "date" | "service" | "client" | "guestClient"
  >,
): Promise<void> {
  const barber = await prisma.barber.findUnique({
    where: { id: appointment.barberId },
    select: { userId: true },
  });

  if (!barber) return;

  const clientName =
    appointment.client?.fullName ??
    appointment.guestClient?.fullName ??
    "Cliente";

  await notifyAppointmentCancelledByClient(barber.userId, {
    clientName,
    serviceName: appointment.service.name,
    date: formatDateDdMmYyyyFromIsoDateLike(appointment.date),
    time: appointment.startTime,
  });
}

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
    message: `Lembrete: Você tem um agendamento de ${appointmentDetails.serviceName} com ${appointmentDetails.barberName} em ${appointmentDetails.date} às ${appointmentDetails.time}.`,
    data: {
      serviceName: appointmentDetails.serviceName,
      barberName: appointmentDetails.barberName,
      date: appointmentDetails.date,
      time: appointmentDetails.time,
    },
  });
}

// ============================================
// Internal email helper
// ============================================

interface EmailPayloadBase {
  recipientName?: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  appointmentId?: string;
}

async function sendTransactionalEmailToUser(
  userId: string,
  payload: EmailPayloadBase &
    (
      | { type: "confirmation"; reason?: undefined }
      | { type: "cancellation"; reason: string }
    ),
): Promise<void> {
  const emailMap = await getAuthUserEmailsByIds([userId]);
  const email = emailMap.get(userId);
  if (!email) return;

  const manageUrl = `${siteUrl()}/pt-BR/meus-agendamentos`;
  const recipientName = payload.recipientName ?? "Cliente";
  const idKey = payload.appointmentId ?? userId;

  if (payload.type === "confirmation") {
    const content = buildAppointmentConfirmationEmailContent({
      recipientName,
      serviceName: payload.serviceName,
      barberName: payload.barberName,
      date: payload.date,
      time: payload.time,
      manageUrl,
    });
    await sendTransactionalEmail({
      toEmail: email,
      template: "appointment-confirmation",
      idempotencyKey: `appointment-confirmed:${idKey}`,
      content,
    });
    return;
  }

  const content = buildAppointmentCancellationEmailContent({
    recipientName,
    serviceName: payload.serviceName,
    barberName: payload.barberName,
    date: payload.date,
    time: payload.time,
    reason: payload.reason,
    bookUrl: `${siteUrl()}/pt-BR/agendar`,
  });
  await sendTransactionalEmail({
    toEmail: email,
    template: "appointment-cancellation",
    idempotencyKey: `appointment-cancelled:${idKey}`,
    content,
  });
}
