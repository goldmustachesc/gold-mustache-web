import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
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
      return NextResponse.json(
        { error: "INVALID_ACCOUNT_ID", message: "ID da conta inválido" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const validation = loyaltyAdjustSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { points, reason } = validation.data;

    // Simulate success
    return NextResponse.json({
      success: true,
      message: `Points adjusted for account ${accountId}: ${points} (${reason})`,
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao ajustar pontos de fidelidade");
  }
}
