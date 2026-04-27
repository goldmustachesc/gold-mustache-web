import { createClient } from "@/lib/supabase/server";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getNotifications, getUnreadCount } from "@/services/notification";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [{ notifications, total }, unreadCount] = await Promise.all([
      getNotifications(user.id, { skip, take: limit }),
      getUnreadCount(user.id),
    ]);

    const response = apiSuccess({
      notifications,
      unreadCount,
      meta: paginationMeta(total, page, limit),
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar notificações");
  }
}
