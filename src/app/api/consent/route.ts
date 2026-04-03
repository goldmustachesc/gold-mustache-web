import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  saveConsentSchema,
  getConsentQuerySchema,
} from "@/lib/validations/consent";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";

/**
 * GET /api/consent
 * Retrieves the current consent status for a user or anonymous visitor.
 *
 * Query params:
 * - anonymousId: UUID for anonymous visitors (stored in localStorage)
 *
 * If the user is authenticated, their userId takes precedence.
 */
export async function GET(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("api", clientId);
    if (!rateLimitResult.success) {
      const res = apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
      res.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
      res.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));
      return res;
    }

    const { searchParams } = new URL(request.url);
    const anonymousId = searchParams.get("anonymousId");

    // Validate query params
    const validation = getConsentQuerySchema.safeParse({ anonymousId });
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Parâmetros inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !anonymousId) {
      return apiSuccess({
        consent: null,
        message: "Nenhum identificador fornecido",
      });
    }

    const where = user
      ? { userId: user.id }
      : { anonymousId: anonymousId as string };

    const consent = await prisma.cookieConsent.findFirst({
      where,
      orderBy: {
        consentDate: "desc",
      },
    });

    if (!consent) {
      return apiSuccess({
        consent: null,
        hasConsent: false,
      });
    }

    return apiSuccess({
      consent: {
        id: consent.id,
        analyticsConsent: consent.analyticsConsent,
        marketingConsent: consent.marketingConsent,
        consentDate: consent.consentDate.toISOString(),
        updatedAt: consent.updatedAt.toISOString(),
      },
      hasConsent: true,
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar consentimento");
  }
}

/**
 * POST /api/consent
 * Saves or updates cookie consent preferences.
 *
 * Body:
 * - analyticsConsent: boolean
 * - marketingConsent: boolean
 * - anonymousId?: string (UUID for anonymous visitors)
 *
 * If the user is authenticated, their userId is used.
 * Otherwise, the anonymousId must be provided.
 */
export async function POST(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("api", clientId);
    if (!rateLimitResult.success) {
      const res = apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
      res.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
      res.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));
      return res;
    }

    const body = await request.json();

    // Validate input
    const validation = saveConsentSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const { analyticsConsent, marketingConsent, anonymousId } = validation.data;

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Ensure we have at least one identifier
    if (!user && !anonymousId) {
      return apiError(
        "MISSING_IDENTIFIER",
        "É necessário estar autenticado ou fornecer um ID anônimo",
        400,
      );
    }

    // Get client metadata
    const ipAddress = getClientIdentifier(request);
    const userAgent = request.headers.get("user-agent") || null;

    // Use transaction to prevent race conditions
    const consent = await prisma.$transaction(async (tx) => {
      // Find existing consent
      const existing = await tx.cookieConsent.findFirst({
        where: user ? { userId: user.id } : { anonymousId: anonymousId },
      });

      if (existing) {
        // Update existing record
        return tx.cookieConsent.update({
          where: { id: existing.id },
          data: {
            analyticsConsent,
            marketingConsent,
            ipAddress,
            userAgent,
            // If user is now authenticated, link to their account
            userId: user?.id ?? existing.userId,
          },
        });
      }

      // Create new record
      return tx.cookieConsent.create({
        data: {
          userId: user?.id ?? null,
          anonymousId: user ? null : anonymousId,
          analyticsConsent,
          marketingConsent,
          ipAddress,
          userAgent,
        },
      });
    });

    return apiSuccess(
      {
        consent: {
          id: consent.id,
          analyticsConsent: consent.analyticsConsent,
          marketingConsent: consent.marketingConsent,
          consentDate: consent.consentDate.toISOString(),
          updatedAt: consent.updatedAt.toISOString(),
        },
        message: "Preferências de cookies salvas com sucesso",
      },
      201,
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao salvar consentimento");
  }
}
