import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notifyAppointmentReminder } from "@/services/notification";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { requireValidOrigin } from "@/lib/api/verify-origin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/appointments/[id]/reminder
 * Sends a reminder notification for an appointment
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    const { id: appointmentId } = await params;

    // Fetch appointment with details (including client phone from profile)
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: { select: { name: true } },
        barber: { select: { id: true, name: true, userId: true } },
        client: {
          select: { id: true, userId: true, fullName: true, phone: true },
        },
        guestClient: { select: { id: true, fullName: true, phone: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Agendamento não encontrado" },
        { status: 404 },
      );
    }

    // Verify that the current user is the barber for this appointment
    if (appointment.barber.userId !== user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Sem permissão para este agendamento" },
        { status: 403 },
      );
    }

    // Check if appointment is still active
    if (appointment.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message:
            "Só é possível enviar lembrete para agendamentos confirmados",
        },
        { status: 400 },
      );
    }

    const formattedDate = formatDateDdMmYyyyFromIsoDateLike(
      appointment.date.toISOString(),
    );

    // Helper to generate WhatsApp URL
    const generateWhatsAppUrl = (phone: string, clientName: string) => {
      const whatsappMessage = encodeURIComponent(
        `Olá ${clientName}! 👋\n\n` +
          `Lembrando do seu agendamento na Gold Mustache:\n\n` +
          `📅 *Data:* ${formattedDate}\n` +
          `⏰ *Horário:* ${appointment.startTime}\n` +
          `✂️ *Serviço:* ${appointment.service.name}\n` +
          `💈 *Barbeiro:* ${appointment.barber.name}\n\n` +
          `Te esperamos! 🤝`,
      );

      // Format phone number for WhatsApp (remove non-digits, ensure country code)
      let formattedPhone = phone.replace(/\D/g, "");
      if (!formattedPhone.startsWith("55")) {
        formattedPhone = `55${formattedPhone}`;
      }

      return `https://wa.me/${formattedPhone}?text=${whatsappMessage}`;
    };

    // For registered clients, send in-app notification AND return WhatsApp link if phone available
    if (appointment.client?.userId) {
      await notifyAppointmentReminder(appointment.client.userId, {
        serviceName: appointment.service.name,
        barberName: appointment.barber.name,
        date: formattedDate,
        time: appointment.startTime,
      });

      // Also return WhatsApp link if client has phone
      if (appointment.client.phone) {
        const clientName =
          (appointment.client.fullName || "").split(" ")[0] || "Cliente";
        return NextResponse.json({
          success: true,
          type: "notification_and_whatsapp",
          whatsappUrl: generateWhatsAppUrl(
            appointment.client.phone,
            clientName,
          ),
          message: "Notificação enviada! Deseja também enviar via WhatsApp?",
        });
      }

      return NextResponse.json({
        success: true,
        type: "notification",
        message: "Lembrete enviado com sucesso!",
      });
    }

    // For guest clients, return WhatsApp link
    if (appointment.guestClient?.phone) {
      const clientName = appointment.guestClient.fullName.split(" ")[0];
      return NextResponse.json({
        success: true,
        type: "whatsapp",
        whatsappUrl: generateWhatsAppUrl(
          appointment.guestClient.phone,
          clientName,
        ),
        message: "Link do WhatsApp gerado",
      });
    }

    return NextResponse.json(
      {
        error: "NO_CONTACT",
        message: "Cliente não possui contato para enviar lembrete",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error sending reminder:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao enviar lembrete" },
      { status: 500 },
    );
  }
}
