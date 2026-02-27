import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";
import { apiError, apiCollection } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return apiError("NOT_FOUND", "Perfil não encontrado", 404);
    }

    const account = await LoyaltyService.getOrCreateAccount(profile.id);

    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where: { loyaltyAccountId: account.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pointTransaction.count({
        where: { loyaltyAccountId: account.id },
      }),
    ]);

    return apiCollection(transactions, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar transações de fidelidade");
  }
}
