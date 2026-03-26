import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess, apiError } from "@/lib/api/response";
import { mapServiceErrorToResponse } from "@/lib/api/service-error-mapper";
import { redemptionCodeSchema } from "@/lib/validations/loyalty";
import { RewardsService } from "@/services/loyalty/rewards.service";
import { z } from "zod";

const useCodeSchema = z.object({
  code: redemptionCodeSchema,
});

export async function POST(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const validation = useCodeSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        validation.error.issues,
      );
    }

    const { code } = validation.data;

    try {
      await RewardsService.validateRedemptionCode(code);
      const updated = await RewardsService.markRedemptionAsUsed(code);
      return apiSuccess(updated);
    } catch (error) {
      if (error instanceof Error) {
        return mapServiceErrorToResponse(error);
      }
      throw error;
    }
  } catch (error) {
    return handlePrismaError(error, "Erro ao marcar resgate como usado");
  }
}
