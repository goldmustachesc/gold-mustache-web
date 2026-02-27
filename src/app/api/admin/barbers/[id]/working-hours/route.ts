import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { updateBarberWorkingHoursSchema } from "@/lib/validations/booking";
import {
  buildWorkingHoursResponse,
  upsertWorkingHoursInTransaction,
} from "@/lib/working-hours";

/**
 * GET /api/admin/barbers/[id]/working-hours
 * Admin fetches working hours for a specific barber
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id: barberId } = await params;

    // Verify barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { id: true, name: true },
    });

    if (!barber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    const workingHours = await prisma.workingHours.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: "asc" },
    });

    const days = buildWorkingHoursResponse(workingHours);

    return apiSuccess({ barber, days });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar horários");
  }
}

/**
 * PUT /api/admin/barbers/[id]/working-hours
 * Admin updates working hours for a specific barber
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id: barberId } = await params;

    // Verify barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { id: true, name: true },
    });

    if (!barber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    // Parse JSON body with error handling
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

    // Process each day: upsert if working, delete if not working
    await prisma.$transaction(async (tx) => {
      await upsertWorkingHoursInTransaction(tx, barberId, days);
    });

    // Fetch updated hours
    const updatedHours = await prisma.workingHours.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: "asc" },
    });

    const result = buildWorkingHoursResponse(updatedHours);

    return apiSuccess({ barber, days: result });
  } catch (error) {
    return handlePrismaError(error, "Erro ao salvar horários");
  }
}
