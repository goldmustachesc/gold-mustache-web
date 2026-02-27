import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAppointmentAsNoShow } from "@/services/booking";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const { id: appointmentId } = await params;
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

    // Check if user is a barber
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    if (!barber) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Apenas barbeiros podem marcar ausência",
        },
        { status: 403 },
      );
    }

    const appointment = await markAppointmentAsNoShow(appointmentId, barber.id);

    return NextResponse.json({ appointment });
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
        APPOINTMENT_NOT_FOUND: {
          status: 404,
          error: "NOT_FOUND",
          message: "Agendamento não encontrado",
        },
        UNAUTHORIZED: {
          status: 403,
          error: "FORBIDDEN",
          message: "Você não tem permissão para marcar este agendamento",
        },
        APPOINTMENT_NOT_MARKABLE: {
          status: 409,
          error: "CONFLICT",
          message:
            "Este agendamento não pode ser marcado como ausência (status inválido)",
        },
        APPOINTMENT_NOT_STARTED: {
          status: 412,
          error: "PRECONDITION_FAILED",
          message:
            "Só é possível marcar ausência após o horário do agendamento",
        },
      };

      const mapped = domainErrors[error.message];
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error, message: mapped.message },
          { status: mapped.status },
        );
      }
    }

    return handlePrismaError(error, "Erro ao marcar ausência");
  }
}
