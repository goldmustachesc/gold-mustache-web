import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthUserEmailMap } from "@/lib/supabase/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const [accounts, emailMap] = await Promise.all([
      prisma.loyaltyAccount.findMany({
        include: {
          profile: {
            select: { userId: true, fullName: true },
          },
        },
        orderBy: { currentPoints: "desc" },
      }),
      getAuthUserEmailMap(),
    ]);

    const result = accounts.map((acc) => ({
      id: acc.id,
      userId: acc.profile.userId,
      fullName: acc.profile.fullName ?? "Sem nome",
      email: emailMap.get(acc.profile.userId) ?? "",
      points: acc.currentPoints,
      tier: acc.tier,
    }));

    return apiSuccess(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar contas de fidelidade");
  }
}
