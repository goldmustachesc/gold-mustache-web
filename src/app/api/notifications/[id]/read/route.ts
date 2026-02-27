import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { markAsRead } from "@/services/notification";
import { requireValidOrigin } from "@/lib/api/verify-origin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

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

    await markAsRead(notificationId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handlePrismaError(error, "Erro ao marcar notificação como lida");
  }
}
