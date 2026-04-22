import { prisma } from "@/lib/prisma";
import { getAuthUserEmailsByIds } from "@/lib/supabase/admin";
import {
  createNotification,
  notifyAppointmentReminder,
} from "@/services/notification";
import { isFeatureEnabled } from "@/services/feature-flags";
import {
  buildAppointmentReminderEmailContent,
  sendTransactionalEmail,
} from "@/services/transactional-email";
import {
  formatDateDdMmYyyyFromIsoDateLike,
  formatIsoDateYyyyMmDdInSaoPaulo,
} from "@/utils/datetime";
import {
  formatPrismaDateToString,
  parseDateStringToUTC,
} from "@/utils/time-slots";
import { AppointmentStatus, NotificationType } from "@prisma/client";

export const APPOINTMENT_REMINDER_CRON_LOCK_KEY = 9142051;

export interface ReminderWindow {
  start: Date;
  end: Date;
}

export interface ProcessAppointmentRemindersResult {
  eligibleCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
}

interface ReminderAppointment {
  id: string;
  date: Date;
  startTime: string;
  reminderSentAt: Date | null;
  service: { name: string };
  barber: { name: string; userId: string };
  client: {
    userId: string;
    fullName: string | null;
    phone: string | null;
  } | null;
  guestClient: { fullName: string; phone: string } | null;
}

export function getReminderWindow(
  reference: Date = new Date(),
): ReminderWindow {
  return {
    start: new Date(reference.getTime() + 23 * 60 * 60 * 1000),
    end: new Date(reference.getTime() + 25 * 60 * 60 * 1000),
  };
}

function buildWhatsAppReminderUrl(
  phone: string,
  clientName: string,
  date: string,
  time: string,
  serviceName: string,
  barberName: string,
): string {
  const message = encodeURIComponent(
    `Olá ${clientName}! 👋\n\n` +
      `Lembrete do seu agendamento na Gold Mustache:\n` +
      `📅 ${date}\n` +
      `⏰ ${time}\n` +
      `✂️ ${serviceName}\n` +
      `💈 ${barberName}\n`,
  );

  let normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone.startsWith("55")) {
    normalizedPhone = `55${normalizedPhone}`;
  }

  return `https://wa.me/${normalizedPhone}?text=${message}`;
}

function appointmentStartsAt(appointment: ReminderAppointment): Date {
  const isoDate = formatPrismaDateToString(appointment.date);
  return new Date(`${isoDate}T${appointment.startTime}:00-03:00`);
}

function inReminderWindow(date: Date, window: ReminderWindow): boolean {
  return date >= window.start && date <= window.end;
}

function windowDateRange(window: ReminderWindow): { gte: Date; lt: Date } {
  const startIsoDate = formatIsoDateYyyyMmDdInSaoPaulo(window.start);
  const endIsoDate = formatIsoDateYyyyMmDdInSaoPaulo(window.end);

  const gte = parseDateStringToUTC(startIsoDate);
  const lt = parseDateStringToUTC(endIsoDate);
  lt.setUTCDate(lt.getUTCDate() + 1);

  return { gte, lt };
}

function manageAppointmentsUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!base) return "http://localhost:3001/pt-BR/meus-agendamentos";
  return `${base.replace(/\/+$/, "")}/pt-BR/meus-agendamentos`;
}

export async function processAppointmentReminders(
  referenceDate: Date = new Date(),
): Promise<ProcessAppointmentRemindersResult> {
  const window = getReminderWindow(referenceDate);
  const dateRange = windowDateRange(window);
  const whatsappEnabled = await isFeatureEnabled(
    "appointmentRemindersWhatsapp",
  );

  const appointments = (await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.CONFIRMED,
      reminderSentAt: null,
      date: {
        gte: dateRange.gte,
        lt: dateRange.lt,
      },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      reminderSentAt: true,
      service: { select: { name: true } },
      barber: { select: { name: true, userId: true } },
      client: { select: { userId: true, fullName: true, phone: true } },
      guestClient: { select: { fullName: true, phone: true } },
    },
  })) as ReminderAppointment[];

  if (appointments.length === 0) {
    return {
      eligibleCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };
  }

  const userIds = appointments
    .map((appointment) => appointment.client?.userId)
    .filter((id): id is string => Boolean(id));
  const emailByUserId = await getAuthUserEmailsByIds([...new Set(userIds)]);

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const appointment of appointments) {
    const startsAt = appointmentStartsAt(appointment);
    if (!inReminderWindow(startsAt, window)) {
      skippedCount++;
      continue;
    }

    const date = formatDateDdMmYyyyFromIsoDateLike(
      formatPrismaDateToString(appointment.date),
    );

    try {
      let delivered = false;

      if (appointment.client?.userId) {
        await notifyAppointmentReminder(appointment.client.userId, {
          serviceName: appointment.service.name,
          barberName: appointment.barber.name,
          date,
          time: appointment.startTime,
        });
        delivered = true;

        const clientEmail = emailByUserId.get(appointment.client.userId);
        if (clientEmail) {
          const firstName =
            appointment.client.fullName?.split(" ")[0] ?? "Cliente";
          const emailContent = buildAppointmentReminderEmailContent({
            recipientName: firstName,
            serviceName: appointment.service.name,
            barberName: appointment.barber.name,
            date,
            time: appointment.startTime,
            manageUrl: manageAppointmentsUrl(),
          });
          await sendTransactionalEmail({
            toEmail: clientEmail,
            template: "appointment-reminder",
            idempotencyKey: `appointment-reminder:${appointment.id}:24h`,
            content: emailContent,
          });
        }
      }

      if (whatsappEnabled) {
        const phone =
          appointment.client?.phone ?? appointment.guestClient?.phone;
        if (phone) {
          const fullName =
            appointment.client?.fullName ?? appointment.guestClient?.fullName;
          const firstName = fullName?.split(" ")[0] ?? "Cliente";

          await createNotification({
            userId: appointment.barber.userId,
            type: NotificationType.APPOINTMENT_REMINDER,
            title: "Lembrete automático (WhatsApp)",
            message: `Enviar lembrete para ${firstName} (${date} às ${appointment.startTime}).`,
            data: {
              appointmentId: appointment.id,
              whatsappUrl: buildWhatsAppReminderUrl(
                phone,
                firstName,
                date,
                appointment.startTime,
                appointment.service.name,
                appointment.barber.name,
              ),
            },
          });
          delivered = true;
        }
      }

      if (!delivered) {
        skippedCount++;
        continue;
      }

      const update = await prisma.appointment.updateMany({
        where: {
          id: appointment.id,
          reminderSentAt: null,
        },
        data: {
          reminderSentAt: new Date(),
        },
      });

      if (update.count === 0) {
        skippedCount++;
        continue;
      }

      sentCount++;
    } catch {
      failedCount++;
    }
  }

  return {
    eligibleCount: appointments.length,
    sentCount,
    failedCount,
    skippedCount,
  };
}
