import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { referralCodeSchema } from "@/lib/validations/loyalty";
import { ReferralService } from "@/services/loyalty/referral.service";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";

export async function POST(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const body = await request.json();
    const validation = referralCodeSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        validation.error.flatten().fieldErrors,
      );
    }

    const { code } = validation.data;

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return apiError("NOT_FOUND", "Perfil não encontrado", 404);
    }

    const account = await LoyaltyService.getOrCreateAccount(profile.id);

    const referrerAccount = await ReferralService.validateReferralCode(
      code,
      account.id,
    );

    const referrerName = ReferralService.getPartialName(
      referrerAccount.profile?.fullName ?? null,
    );

    return apiSuccess({ valid: true, referrerName });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("não encontrado")) {
        return apiError("NOT_FOUND", error.message, 404);
      }
      return apiError("BAD_REQUEST", error.message, 400);
    }
    return apiError("INTERNAL_ERROR", "Erro interno do servidor", 500);
  }
}
