import { apiError, apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { prisma } from "@/lib/prisma";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { createClient } from "@/lib/supabase/server";
import { claimGuestAppointmentsToProfile } from "@/services/guest-linking";

export async function POST(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const guestToken = request.headers.get("X-Guest-Token");
    if (!guestToken) {
      return apiError("MISSING_TOKEN", "Token guest não informado", 401);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          fullName:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0],
          phone: user.user_metadata?.phone || null,
        },
      });
    }

    const result = await claimGuestAppointmentsToProfile({
      profileId: profile.id,
      guestToken,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
        MISSING_GUEST_TOKEN: {
          status: 401,
          error: "MISSING_TOKEN",
          message: "Token guest não informado",
        },
        GUEST_NOT_FOUND: {
          status: 404,
          error: "GUEST_NOT_FOUND",
          message:
            "Nenhum histórico guest válido foi encontrado neste dispositivo.",
        },
        GUEST_ALREADY_CLAIMED: {
          status: 409,
          error: "GUEST_ALREADY_CLAIMED",
          message: "Este histórico guest já foi vinculado a outra conta.",
        },
      };

      const mapped = domainErrors[error.message];
      if (mapped) {
        return apiError(mapped.error, mapped.message, mapped.status);
      }
    }

    return handlePrismaError(error, "Erro ao importar agendamentos guest");
  }
}
