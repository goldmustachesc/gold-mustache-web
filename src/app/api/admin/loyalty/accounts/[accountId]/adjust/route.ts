import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiError, apiMessage } from "@/lib/api/response";
import {
  accountIdSchema,
  loyaltyAdjustSchema,
} from "@/lib/validations/loyalty";

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

    // Simulate success
    return apiMessage(
      `Points adjusted for account ${accountId}: ${points} (${reason})`,
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao ajustar pontos de fidelidade");
  }
}
