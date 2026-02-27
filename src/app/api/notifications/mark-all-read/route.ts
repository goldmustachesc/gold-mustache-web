import { createClient } from "@/lib/supabase/server";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { markAllAsRead } from "@/services/notification";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { apiMessage, apiError } from "@/lib/api/response";

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

    await markAllAsRead(user.id);

    return apiMessage();
  } catch (error) {
    return handlePrismaError(error, "Erro ao marcar notificações como lidas");
  }
}
