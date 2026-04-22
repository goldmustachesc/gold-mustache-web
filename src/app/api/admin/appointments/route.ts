import { requireAdmin } from "@/lib/auth/requireAdmin";
import { paginationMeta } from "@/lib/api/pagination";
import { apiCollection, apiError, apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  adminCreateAppointmentSchema,
  listAdminAppointmentsQuerySchema,
} from "@/lib/validations/admin-appointments";
import {
  createAppointmentAsAdmin,
  listAppointmentsForAdmin,
} from "@/services/admin/appointments";
import type { AppointmentStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const rl = await checkRateLimit("adminAppointments", admin.profileId);
    if (!rl.success) {
      return apiError(
        "RATE_LIMIT_EXCEEDED",
        "Limite de requisições excedido",
        429,
      );
    }

    const url = new URL(request.url);
    const parsed = listAdminAppointmentsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Parâmetros de consulta inválidos",
        400,
        parsed.error.flatten(),
      );
    }

    const { page, limit, status, ...rest } = parsed.data;
    const { rows, total } = await listAppointmentsForAdmin({
      ...rest,
      page,
      limit,
      status: status as AppointmentStatus | undefined,
    });

    return apiCollection(rows, paginationMeta(total, page, limit));
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar agendamentos");
  }
}

const CREATE_ERROR_MAP: Record<string, { status: number; message: string }> = {
  SLOT_OCCUPIED: { status: 409, message: "Horário já ocupado" },
  SLOT_IN_PAST: { status: 400, message: "Horário no passado" },
  SLOT_TOO_SOON: { status: 400, message: "Horário muito próximo" },
  SHOP_CLOSED: { status: 400, message: "Barbearia fechada" },
  BARBER_UNAVAILABLE: { status: 400, message: "Barbeiro indisponível" },
  SLOT_UNAVAILABLE: { status: 400, message: "Horário indisponível" },
  CLIENT_BANNED: { status: 400, message: "Cliente banido" },
  CLIENT_OVERLAPPING_APPOINTMENT: {
    status: 409,
    message: "Cliente já possui agendamento neste horário",
  },
  PROFILE_NOT_FOUND: { status: 404, message: "Perfil não encontrado" },
};

export async function POST(request: Request) {
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
  const parsed = adminCreateAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Dados inválidos",
      422,
      parsed.error.flatten(),
    );
  }

  try {
    const result = await createAppointmentAsAdmin(parsed.data, admin.profileId);
    return apiSuccess(result, 201);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const mapped = CREATE_ERROR_MAP[msg];
    if (mapped) return apiError(msg, mapped.message, mapped.status);
    return handlePrismaError(error, "Erro ao criar agendamento");
  }
}
