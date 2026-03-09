import { createClient } from "@/lib/supabase/server";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { markAllAsRead } from "@/services/notification";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { apiMessage, apiError } from "@/lib/api/response";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";

export async function PATCH(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

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

    await markAllAsRead(user.id);

    return apiMessage();
  } catch (error) {
    return handlePrismaError(error, "Erro ao marcar notificações como lidas");
  }
}
