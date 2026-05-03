import { isFeatureEnabled } from "@/services/feature-flags";

const RESEND_API_URL = "https://api.resend.com/emails";

export type TransactionalEmailTemplate =
  | "appointment-confirmation"
  | "appointment-cancellation"
  | "appointment-reminder";

export interface TransactionalEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface SendTransactionalEmailInput {
  toEmail: string;
  template: TransactionalEmailTemplate;
  content: TransactionalEmailContent;
  idempotencyKey?: string;
}

export type SendTransactionalEmailResult =
  | {
      status: "sent";
      providerMessageId: string | null;
    }
  | {
      status: "skipped";
      reason:
        | "feature_disabled"
        | "provider_not_configured"
        | "invalid_recipient";
    }
  | {
      status: "failed";
      reason: "provider_error" | "network_error";
      providerStatus?: number;
    };

interface ResendResponse {
  id?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function trimOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const enabled = await isFeatureEnabled("transactionalEmails");
  if (!enabled) {
    return { status: "skipped", reason: "feature_disabled" };
  }

  const apiKey = trimOrNull(process.env.RESEND_API_KEY);
  const from = trimOrNull(process.env.EMAIL_FROM);
  const replyTo = trimOrNull(process.env.EMAIL_REPLY_TO);

  if (!apiKey || !from) {
    return { status: "skipped", reason: "provider_not_configured" };
  }

  const toEmail = input.toEmail.trim();
  if (!isValidEmail(toEmail)) {
    return { status: "skipped", reason: "invalid_recipient" };
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: input.content.subject,
        html: input.content.html,
        text: input.content.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      return {
        status: "failed",
        reason: "provider_error",
        providerStatus: response.status,
      };
    }

    const payload = (await response.json()) as ResendResponse;
    return {
      status: "sent",
      providerMessageId: payload.id ?? null,
    };
  } catch {
    return {
      status: "failed",
      reason: "network_error",
    };
  }
}

export interface AppointmentEmailPayload {
  recipientName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  manageUrl: string;
}

export interface AppointmentCancellationEmailPayload {
  recipientName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  reason?: string;
  bookUrl: string;
}

export function buildAppointmentConfirmationEmailContent(
  payload: AppointmentEmailPayload,
): TransactionalEmailContent {
  const recipientName = escapeHtml(payload.recipientName);
  const serviceName = escapeHtml(payload.serviceName);
  const barberName = escapeHtml(payload.barberName);
  const date = escapeHtml(payload.date);
  const time = escapeHtml(payload.time);
  const manageUrl = escapeHtml(payload.manageUrl);

  const subject = `Agendamento confirmado: ${payload.serviceName} em ${payload.date}`;
  const text =
    `Olá ${payload.recipientName},\n\n` +
    `Seu agendamento na Gold Mustache foi confirmado!\n` +
    `Serviço: ${payload.serviceName}\n` +
    `Barbeiro: ${payload.barberName}\n` +
    `Data: ${payload.date}\n` +
    `Horário: ${payload.time}\n\n` +
    `Gerenciar agendamento: ${payload.manageUrl}\n`;

  const html =
    `<p>Olá <strong>${recipientName}</strong>,</p>` +
    "<p>Seu agendamento na Gold Mustache foi <strong>confirmado</strong>!</p>" +
    `<ul><li>Serviço: ${serviceName}</li>` +
    `<li>Barbeiro: ${barberName}</li>` +
    `<li>Data: ${date}</li>` +
    `<li>Horário: ${time}</li></ul>` +
    `<p><a href="${manageUrl}">Ver meu agendamento</a></p>`;

  return { subject, text, html };
}

export function buildAppointmentCancellationEmailContent(
  payload: AppointmentCancellationEmailPayload,
): TransactionalEmailContent {
  const recipientName = escapeHtml(payload.recipientName);
  const serviceName = escapeHtml(payload.serviceName);
  const barberName = escapeHtml(payload.barberName);
  const date = escapeHtml(payload.date);
  const time = escapeHtml(payload.time);
  const reason = payload.reason ? escapeHtml(payload.reason) : null;
  const bookUrl = escapeHtml(payload.bookUrl);

  const subject = `Agendamento cancelado: ${payload.serviceName} em ${payload.date}`;
  const reasonLine = payload.reason ? `Motivo: ${payload.reason}\n` : "";
  const reasonHtml = reason ? `<p>Motivo: ${reason}</p>` : "";

  const text =
    `Olá ${payload.recipientName},\n\n` +
    `Seu agendamento na Gold Mustache foi cancelado.\n` +
    `Serviço: ${payload.serviceName}\n` +
    `Barbeiro: ${payload.barberName}\n` +
    `Data: ${payload.date}\n` +
    `Horário: ${payload.time}\n` +
    reasonLine +
    `\nAgendar novamente: ${payload.bookUrl}\n`;

  const html =
    `<p>Olá <strong>${recipientName}</strong>,</p>` +
    "<p>Seu agendamento na Gold Mustache foi cancelado.</p>" +
    `<ul><li>Serviço: ${serviceName}</li>` +
    `<li>Barbeiro: ${barberName}</li>` +
    `<li>Data: ${date}</li>` +
    `<li>Horário: ${time}</li></ul>` +
    reasonHtml +
    `<p><a href="${bookUrl}">Agendar novamente</a></p>`;

  return { subject, text, html };
}

export interface AppointmentReminderEmailPayload {
  recipientName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  manageUrl: string;
}

export function buildAppointmentReminderEmailContent(
  payload: AppointmentReminderEmailPayload,
): TransactionalEmailContent {
  const recipientName = escapeHtml(payload.recipientName);
  const serviceName = escapeHtml(payload.serviceName);
  const barberName = escapeHtml(payload.barberName);
  const date = escapeHtml(payload.date);
  const time = escapeHtml(payload.time);
  const manageUrl = escapeHtml(payload.manageUrl);

  const subject = `Lembrete: seu agendamento amanhã às ${payload.time}`;
  const text =
    `Olá ${payload.recipientName},\n\n` +
    `Este é um lembrete do seu agendamento na Gold Mustache.\n` +
    `Serviço: ${payload.serviceName}\n` +
    `Barbeiro: ${payload.barberName}\n` +
    `Data: ${payload.date}\n` +
    `Horário: ${payload.time}\n\n` +
    `Gerenciar agendamento: ${payload.manageUrl}\n`;

  const html =
    `<p>Olá <strong>${recipientName}</strong>,</p>` +
    "<p>Este é um lembrete do seu agendamento na Gold Mustache.</p>" +
    `<ul><li>Serviço: ${serviceName}</li>` +
    `<li>Barbeiro: ${barberName}</li>` +
    `<li>Data: ${date}</li>` +
    `<li>Horário: ${time}</li></ul>` +
    `<p><a href="${manageUrl}">Gerenciar agendamento</a></p>`;

  return { subject, text, html };
}
