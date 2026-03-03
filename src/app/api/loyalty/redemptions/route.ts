import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { apiSuccess, apiError, apiCollection } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { redeemRewardSchema } from "@/lib/validations/loyalty";
import { mapServiceErrorToResponse } from "@/lib/api/service-error-mapper";
import { deriveRedemptionStatus } from "@/lib/loyalty/status";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";
import { RewardsService } from "@/services/loyalty/rewards.service";

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
    const validation = redeemRewardSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        validation.error.issues,
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

    let redemption: Awaited<ReturnType<typeof RewardsService.redeemReward>>;
    try {
      redemption = await RewardsService.redeemReward(
        account.id,
        validation.data.rewardId,
      );
    } catch (error) {
      if (error instanceof Error) {
        return mapServiceErrorToResponse(error);
      }
      throw error;
    }

    const reward = await prisma.reward.findUnique({
      where: { id: validation.data.rewardId },
      select: { name: true, type: true },
    });

    return apiSuccess(
      {
        id: redemption.id,
        code: redemption.code,
        pointsSpent: redemption.pointsSpent,
        expiresAt: redemption.expiresAt,
        reward: reward ?? null,
      },
      201,
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao resgatar recompensa");
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return apiError("NOT_FOUND", "Perfil não encontrado", 404);
    }

    const account = await LoyaltyService.getOrCreateAccount(profile.id);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [redemptions, total] = await Promise.all([
      prisma.redemption.findMany({
        where: { loyaltyAccountId: account.id },
        include: { reward: { select: { name: true, type: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.redemption.count({
        where: { loyaltyAccountId: account.id },
      }),
    ]);

    const items = redemptions.map((r) => ({
      id: r.id,
      code: r.code,
      pointsSpent: r.pointsSpent,
      usedAt: r.usedAt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      status: deriveRedemptionStatus(r),
      reward: r.reward,
    }));

    return apiCollection(items, paginationMeta(total, page, limit));
  } catch (error) {
    return handlePrismaError(error, "Erro ao listar resgates");
  }
}
