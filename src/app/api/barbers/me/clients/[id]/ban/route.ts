import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, apiMessage } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";
import { banClient, unbanClient } from "@/services/banned-client";
import { z } from "zod";

const banClientSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { id: clientId } = await params;

    const [profile, guestClient] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: clientId },
        select: { id: true },
      }),
      prisma.guestClient.findUnique({
        where: { id: clientId },
        select: { id: true },
      }),
    ]);

    if (!profile && !guestClient) {
      return apiError("NOT_FOUND", "Cliente não encontrado", 404);
    }

    const clientType = profile ? "registered" : "guest";

    const hasRelationship = await prisma.appointment.findFirst({
      where: {
        barberId: auth.barberId,
        ...(profile
          ? { clientId: profile.id }
          : { guestClientId: guestClient?.id }),
      },
      select: { id: true },
    });

    if (!hasRelationship) {
      return apiError(
        "FORBIDDEN",
        "Sem permissão para banir este cliente",
        403,
      );
    }

    const body = await request.json();
    const validation = banClientSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        validation.error.issues[0]?.message || "Dados inválidos",
        400,
      );
    }

    const ban = await banClient({
      clientId,
      clientType: clientType as "registered" | "guest",
      reason: validation.data.reason,
      bannedByBarberId: auth.barberId,
    });

    return apiSuccess(ban);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CLIENT_ALREADY_BANNED") {
        return apiError(
          "CLIENT_ALREADY_BANNED",
          "Este cliente já está banido",
          409,
        );
      }
      if (error.message === "CLIENT_NOT_FOUND") {
        return apiError("NOT_FOUND", "Cliente não encontrado", 404);
      }
    }
    return handlePrismaError(error, "Erro ao banir cliente");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { id: clientId } = await params;

    const ban = await prisma.bannedClient.findFirst({
      where: {
        OR: [{ profileId: clientId }, { guestClientId: clientId }],
        bannedBy: auth.barberId,
      },
      select: { id: true },
    });

    if (!ban) {
      return apiError(
        "NOT_FOUND",
        "Nenhum banimento encontrado para este cliente",
        404,
      );
    }

    await unbanClient(ban.id);

    return apiMessage("Cliente desbanido com sucesso");
  } catch (error) {
    if (error instanceof Error && error.message === "BAN_NOT_FOUND") {
      return apiError("NOT_FOUND", "Banimento não encontrado", 404);
    }
    return handlePrismaError(error, "Erro ao desbanir cliente");
  }
}
