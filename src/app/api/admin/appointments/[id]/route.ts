import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { adminRescheduleAppointmentSchema } from "@/lib/validations/admin-appointments";
import { rescheduleAppointmentAsAdmin } from "@/services/admin/appointments";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const rl = await checkRateLimit("adminAppointments", admin.profileId);
  if (!rl.success) {
    return apiError(
      "RATE_LIMIT_EXCEEDED",
      "Limite de requisições excedido",
      429,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = adminRescheduleAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Dados inválidos",
      422,
      parsed.error.flatten(),
    );
  }

  const { id } = await params;

  try {
    const result = await rescheduleAppointmentAsAdmin(
      id,
      parsed.data,
      admin.profileId,
    );
    return apiSuccess(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (msg === "APPOINTMENT_NOT_FOUND") {
      return apiError(msg, "Agendamento não encontrado", 404);
    }
    if (msg === "APPOINTMENT_NOT_RESCHEDULABLE") {
      return apiError(msg, "Agendamento não pode ser reagendado", 400);
    }
    if (msg === "SLOT_IN_PAST") {
      return apiError(msg, "Horário no passado", 400);
    }
    if (msg === "SLOT_UNAVAILABLE") {
      return apiError(msg, "Horário indisponível", 400);
    }
    if (msg === "CLIENT_OVERLAPPING_APPOINTMENT") {
      return apiError(msg, "Cliente já possui agendamento neste horário", 409);
    }

    return handlePrismaError(error, "Erro ao reagendar agendamento");
  }
}
