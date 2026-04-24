import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import {
  shopClosureSchema,
  dateRangeQuerySchema,
} from "@/lib/validations/booking";
import { getShopClosures, createShopClosure } from "@/services/shop-closure";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(request.url);
    const queryValidation = dateRangeQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    if (!queryValidation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        queryValidation.error.flatten().fieldErrors,
      );
    }

    const closures = await getShopClosures(queryValidation.data);
    return apiSuccess(closures);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar fechamentos");
  }
}

export async function POST(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const validation = shopClosureSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const {
      date,
      startTime = null,
      endTime = null,
      reason = null,
    } = validation.data;

    const created = await createShopClosure({
      date,
      startTime,
      endTime,
      reason,
    });
    return apiSuccess(created, 201);
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar fechamento");
  }
}
