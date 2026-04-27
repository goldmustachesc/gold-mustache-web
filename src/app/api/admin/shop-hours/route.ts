import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { updateShopHoursSchema } from "@/lib/validations/booking";
import { getShopHours, updateShopHours } from "@/services/shop-hours";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const days = await getShopHours();
    return apiSuccess(days);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar horários");
  }
}

export async function PUT(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const validation = updateShopHoursSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const results = await updateShopHours(validation.data.days);
    return apiSuccess(results);
  } catch (error) {
    return handlePrismaError(error, "Erro ao salvar horários");
  }
}
