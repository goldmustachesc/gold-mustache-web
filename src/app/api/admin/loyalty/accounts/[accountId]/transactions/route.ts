import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { accountIdSchema } from "@/lib/validations/loyalty";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { accountId } = await params;
    const accountIdValidation = accountIdSchema.safeParse(accountId);
    if (!accountIdValidation.success) {
      return apiError("INVALID_ACCOUNT_ID", "ID da conta inválido", 400);
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * limit;

    const where = { loyaltyAccountId: accountId };

    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pointTransaction.count({ where }),
    ]);

    const data = transactions.map((tx) => ({
      id: tx.id,
      loyaltyAccountId: tx.loyaltyAccountId,
      type: tx.type,
      points: tx.points,
      description: tx.description,
      referenceId: tx.referenceId,
      expiresAt: tx.expiresAt?.toISOString() ?? null,
      createdAt: tx.createdAt.toISOString(),
    }));

    return apiSuccess({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar transações da conta");
  }
}
