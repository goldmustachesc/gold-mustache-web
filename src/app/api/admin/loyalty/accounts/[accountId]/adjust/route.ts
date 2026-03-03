import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import {
  accountIdSchema,
  loyaltyAdjustSchema,
} from "@/lib/validations/loyalty";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const originError = requireValidOrigin(req);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { accountId } = await params;

    const accountIdValidation = accountIdSchema.safeParse(accountId);

    if (!accountIdValidation.success) {
      return apiError("INVALID_ACCOUNT_ID", "ID da conta inválido", 400);
    }

    const body = await req.json();
    const validation = loyaltyAdjustSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const { points, reason } = validation.data;

    const account = await prisma.loyaltyAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return apiError("NOT_FOUND", "Conta de fidelidade não encontrada", 404);
    }

    const newPoints = account.currentPoints + points;
    if (newPoints < 0) {
      return apiError(
        "INSUFFICIENT_POINTS",
        "Saldo insuficiente para este ajuste",
        422,
      );
    }

    const [updatedAccount] = await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: accountId },
        data: {
          currentPoints: newPoints,
          ...(points > 0 && {
            lifetimePoints: { increment: points },
          }),
        },
      }),
      prisma.pointTransaction.create({
        data: {
          loyaltyAccountId: accountId,
          type: "ADJUSTED",
          points,
          description: reason,
        },
      }),
    ]);

    await LoyaltyService.recalculateTier(accountId);

    const refreshed = await prisma.loyaltyAccount.findUnique({
      where: { id: accountId },
      select: { tier: true },
    });

    return apiSuccess({
      id: updatedAccount.id,
      currentPoints: updatedAccount.currentPoints,
      lifetimePoints: updatedAccount.lifetimePoints,
      tier: refreshed?.tier ?? updatedAccount.tier,
      adjustedPoints: points,
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao ajustar pontos de fidelidade");
  }
}
