import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { adminCancelAppointmentSchema } from "@/lib/validations/admin-appointments";
import { cancelAppointmentAsAdmin } from "@/services/admin/appointments";

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
  const parsed = adminCancelAppointmentSchema.safeParse(body);
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
    const result = await cancelAppointmentAsAdmin(
      id,
      parsed.data.reason,
      admin.profileId,
    );
    return apiSuccess(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg === "APPOINTMENT_NOT_FOUND")
      return apiError(msg, "Agendamento não encontrado", 404);
    if (msg === "APPOINTMENT_NOT_CANCELLABLE")
      return apiError(msg, "Agendamento não pode ser cancelado", 400);
    if (msg === "APPOINTMENT_IN_PAST")
      return apiError(msg, "Agendamento no passado", 400);
    return handlePrismaError(error, "Erro ao cancelar agendamento");
  }
}
