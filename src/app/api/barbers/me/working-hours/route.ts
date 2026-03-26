import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";
import { updateBarberWorkingHoursSchema } from "@/lib/validations/booking";
import {
  buildWorkingHoursResponse,
  upsertWorkingHoursInTransaction,
} from "@/lib/working-hours";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";

/**
 * GET /api/barbers/me/working-hours
 * Returns the logged-in barber's working hours for all 7 days
 */
export async function GET() {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const workingHours = await prisma.workingHours.findMany({
      where: { barberId: auth.barberId },
      orderBy: { dayOfWeek: "asc" },
    });

    const days = buildWorkingHoursResponse(workingHours);

    return apiSuccess(days);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar horários");
  }
}

/**
 * PUT /api/barbers/me/working-hours
 * Updates the logged-in barber's working hours (bulk upsert/delete)
 */
export async function PUT(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", "Corpo da requisição inválido", 400);
    }

    const validation = updateBarberWorkingHoursSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const { days } = validation.data;

    await prisma.$transaction(async (tx) => {
      await upsertWorkingHoursInTransaction(tx, auth.barberId, days);
    });

    const updatedHours = await prisma.workingHours.findMany({
      where: { barberId: auth.barberId },
      orderBy: { dayOfWeek: "asc" },
    });

    const result = buildWorkingHoursResponse(updatedHours);

    return apiSuccess(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao salvar horários");
  }
}
