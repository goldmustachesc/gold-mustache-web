import { createClient } from "@/lib/supabase/server";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getNotifications, getUnreadCount } from "@/services/notification";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const notifications = await getNotifications(user.id);
    const unreadCount = await getUnreadCount(user.id);

    return apiSuccess({ notifications, unreadCount });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar notificações");
  }
}
