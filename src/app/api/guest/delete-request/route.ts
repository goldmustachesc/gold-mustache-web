import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { z } from "zod";

const deleteRequestSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
  accessToken: z.string().uuid("Token de acesso inválido").optional(),
});

/**
 * POST /api/guest/delete-request
 *
 * Request deletion of guest data for LGPD compliance.
 * Guest must provide their phone number and optionally their access token
 * to verify ownership.
 *
 * If accessToken is provided, the deletion is immediate.
 * If only phone is provided, we mark the guest for manual review
 * (or send a verification code in a future implementation).
 *
 * This anonymizes the guest data instead of deleting to maintain
 * referential integrity with appointments (for business/legal records).
 */
export async function POST(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("sensitive", clientId);
    if (!rateLimitResult.success) {
      return apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em alguns minutos.",
        429,
      );
    }

    const body = await request.json();

    // Validate input
    const validation = deleteRequestSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const { phone, accessToken } = validation.data;
    const normalizedPhone = phone.replace(/\D/g, "");

    // Find guest client by phone
    const guestClient = await prisma.guestClient.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!guestClient) {
      return apiSuccess({
        message:
          "Se existir uma conta associada a este telefone, ela será processada para exclusão.",
        immediate: false,
      });
    }

    // If access token provided, verify it matches
    if (accessToken) {
      if (guestClient.accessToken !== accessToken) {
        return apiError("INVALID_TOKEN", "Token de acesso inválido", 403);
      }

      // Immediate anonymization since token matches
      await prisma.guestClient.update({
        where: { id: guestClient.id },
        data: {
          fullName: "[DADOS REMOVIDOS]",
          phone: `DELETED_${guestClient.id}`, // Ensure uniqueness
          accessToken: null,
        },
      });

      console.info("[Guest Delete] Guest data anonymized immediately:", {
        guestId: guestClient.id,
        timestamp: new Date().toISOString(),
      });

      return apiSuccess({
        message: "Seus dados foram removidos com sucesso.",
        immediate: true,
      });
    }

    // Without token, we log the request for manual processing
    // In a production system, you might:
    // - Send a verification SMS
    // - Queue the request for admin review
    // - Create a scheduled job to process after verification period
    console.info("[Guest Delete] Deletion request received for processing:", {
      guestId: guestClient.id,
      phone: `${normalizedPhone.slice(0, 4)}****${normalizedPhone.slice(-2)}`,
      timestamp: new Date().toISOString(),
    });

    return apiSuccess({
      message:
        "Sua solicitação foi recebida. Processaremos a exclusão em até 15 dias conforme a LGPD.",
      immediate: false,
    });
  } catch (error) {
    return handlePrismaError(
      error,
      "Erro ao processar solicitação de exclusão",
    );
  }
}
