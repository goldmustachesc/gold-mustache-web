import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { z } from "zod";
import { normalizePhoneDigits } from "@/lib/booking/phone";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";

const updateClientSchema = z.object({
  fullName: z
    .string()
    .min(1, "Nome é obrigatório")
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 11;
      },
      { message: "Telefone deve ter 10 ou 11 dígitos" },
    ),
});

/**
 * PATCH /api/barbers/me/clients/[id]
 * Updates a guest client's information
 * Only guest clients can be edited (registered clients manage their own profiles)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { id: clientId } = await params;

    const guestClient = await prisma.guestClient.findUnique({
      where: { id: clientId },
    });

    if (!guestClient) {
      const profile = await prisma.profile.findUnique({
        where: { id: clientId },
      });

      if (profile) {
        return apiError(
          "CANNOT_EDIT_REGISTERED",
          "Clientes cadastrados gerenciam seus próprios dados pelo perfil",
          400,
        );
      }

      return apiError("NOT_FOUND", "Cliente não encontrado", 404);
    }

    const body = await request.json();
    const validation = updateClientSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        validation.error.issues[0]?.message || "Dados inválidos",
        400,
      );
    }

    const { fullName, phone } = validation.data;
    const normalizedPhone = normalizePhoneDigits(phone);

    if (normalizedPhone !== guestClient.phone) {
      const existingGuest = await prisma.guestClient.findFirst({
        where: {
          phone: normalizedPhone,
          id: { not: clientId },
        },
      });

      if (existingGuest) {
        return apiError(
          "PHONE_EXISTS",
          "Este telefone já está cadastrado para outro cliente",
          409,
        );
      }

      const existingProfile = await prisma.profile.findFirst({
        where: { phone: normalizedPhone },
      });

      if (existingProfile) {
        return apiError(
          "PHONE_EXISTS",
          "Este telefone já está cadastrado para um cliente",
          409,
        );
      }
    }

    const updatedClient = await prisma.guestClient.update({
      where: { id: clientId },
      data: {
        fullName: fullName.trim(),
        phone: normalizedPhone,
      },
    });

    const client = {
      id: updatedClient.id,
      fullName: updatedClient.fullName,
      phone: updatedClient.phone,
      type: "guest" as const,
    };
    return apiSuccess(client);
  } catch (error) {
    return handlePrismaError(error, "Erro ao atualizar cliente");
  }
}
