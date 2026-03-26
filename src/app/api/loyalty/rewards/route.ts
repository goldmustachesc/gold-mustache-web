import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess, apiError } from "@/lib/api/response";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";
import { isFeatureEnabled } from "@/services/feature-flags";

export async function GET() {
  const loyaltyEnabled = await isFeatureEnabled("loyaltyProgram");
  if (!loyaltyEnabled) {
    return apiError("NOT_FOUND", "Recurso não disponível", 404);
  }

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

    const rewards = await prisma.reward.findMany({
      where: {
        active: true,
      },
      orderBy: {
        pointsCost: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        pointsCost: true,
        type: true,
        value: true,
        imageUrl: true,
        stock: true,
      },
    });

    const formattedRewards = rewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      costInPoints: reward.pointsCost,
      imageUrl: reward.imageUrl,
      type: reward.type,
      value: reward.value,
      stock: reward.stock,
    }));

    const response = apiSuccess(formattedRewards);
    response.headers.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=300",
    );
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar recompensas");
  }
}
