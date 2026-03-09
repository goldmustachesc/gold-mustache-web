import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";
import { apiSuccess, apiError } from "@/lib/api/response";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const rateLimitResult = await checkRateLimit(
      "api",
      getUserRateLimitIdentifier(user.id),
    );
    if (!rateLimitResult.success) {
      return apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return apiError("NOT_FOUND", "Perfil não encontrado", 404);
    }

    const account = await LoyaltyService.getOrCreateAccount(profile.id);

    const referralsCount = await prisma.loyaltyAccount.count({
      where: { referredById: account.id },
    });

    return apiSuccess({
      id: account.id,
      currentPoints: account.currentPoints,
      lifetimePoints: account.lifetimePoints,
      tier: account.tier,
      referralCode: account.referralCode,
      referredById: account.referredById,
      referralsCount,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar conta de fidelidade");
  }
}
