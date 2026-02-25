import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAllAsRead } from "@/services/notification";
import { requireValidOrigin } from "@/lib/api/verify-origin";

export async function PATCH(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

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

    await markAllAsRead(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Erro ao marcar notificações como lidas",
      },
      { status: 500 },
    );
  }
}
