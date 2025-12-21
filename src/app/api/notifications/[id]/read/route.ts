import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAsRead } from "@/services/notification";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: notificationId } = await params;
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

    await markAsRead(notificationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Erro ao marcar notificação como lida",
      },
      { status: 500 },
    );
  }
}
