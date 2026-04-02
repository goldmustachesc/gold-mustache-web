import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess, apiError } from "@/lib/api/response";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";
import { getDashboardStatsData } from "@/services/dashboard";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const requestUrl = new URL(request.url);
    const includeClientStats =
      requestUrl.searchParams.get("includeClientStats") !== "false";

    const [profile, barberProfile] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: user.id },
      }),
      prisma.barber.findUnique({
        where: { userId: user.id },
      }),
    ]);

    if (!profile) {
      return apiError("NOT_FOUND", "Perfil não encontrado", 404);
    }

    const activeBarberProfile = barberProfile?.active
      ? {
          id: barberProfile.id,
          name: barberProfile.name,
          avatarUrl: barberProfile.avatarUrl,
        }
      : null;

    const stats = await getDashboardStatsData({
      profile: {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
        street: profile.street,
        number: profile.number,
        complement: profile.complement,
        neighborhood: profile.neighborhood,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        emailVerified: profile.emailVerified,
        role: profile.role,
        createdAt:
          profile.createdAt instanceof Date
            ? profile.createdAt.toISOString()
            : new Date(0).toISOString(),
        updatedAt:
          profile.updatedAt instanceof Date
            ? profile.updatedAt.toISOString()
            : new Date(0).toISOString(),
      },
      barberProfile: activeBarberProfile,
      includeClientStats,
    });

    const response = apiSuccess(stats);
    response.headers.set(
      "Cache-Control",
      "private, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao carregar estatísticas");
  }
}
