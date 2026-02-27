import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getNotifications, getUnreadCount } from "@/services/notification";

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    const notifications = await getNotifications(user.id);
    const unreadCount = await getUnreadCount(user.id);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar notificações");
  }
}
