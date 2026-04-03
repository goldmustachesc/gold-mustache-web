import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthUserEmailsByIds } from "@/lib/supabase/admin";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      prisma.loyaltyAccount.findMany({
        include: {
          profile: {
            select: { userId: true, fullName: true },
          },
        },
        orderBy: { currentPoints: "desc" },
        skip,
        take: limit,
      }),
      prisma.loyaltyAccount.count(),
    ]);

    const userIds = accounts.map((acc) => acc.profile.userId);
    const emailMap = await getAuthUserEmailsByIds(userIds);

    const data = accounts.map((acc) => ({
      id: acc.id,
      userId: acc.profile.userId,
      fullName: acc.profile.fullName ?? "Sem nome",
      email: emailMap.get(acc.profile.userId) ?? "",
      points: acc.currentPoints,
      tier: acc.tier,
    }));

    return apiSuccess({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar contas de fidelidade");
  }
}
