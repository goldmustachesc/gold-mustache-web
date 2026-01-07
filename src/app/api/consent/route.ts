import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  saveConsentSchema,
  getConsentQuerySchema,
} from "@/lib/validations/consent";
import { getClientIdentifier } from "@/lib/rate-limit";

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
    const { searchParams } = new URL(request.url);
    const anonymousId = searchParams.get("anonymousId");

    // Validate query params
    const validation = getConsentQuerySchema.safeParse({ anonymousId });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Build query conditions
    const whereConditions = [];

    if (user) {
      whereConditions.push({ userId: user.id });
    }

    if (anonymousId) {
      whereConditions.push({ anonymousId });
    }

    if (whereConditions.length === 0) {
      return NextResponse.json({
        consent: null,
        message: "Nenhum identificador fornecido",
      });
    }

    // Find consent record
    const consent = await prisma.cookieConsent.findFirst({
      where: {
        OR: whereConditions,
      },
      orderBy: {
        consentDate: "desc",
      },
    });

    if (!consent) {
      return NextResponse.json({
        consent: null,
        hasConsent: false,
      });
    }

    return NextResponse.json({
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
    console.error("Error fetching consent:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar consentimento" },
      { status: 500 },
    );
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
    const body = await request.json();

    // Validate input
    const validation = saveConsentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
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
      return NextResponse.json(
        {
          error: "MISSING_IDENTIFIER",
          message: "É necessário estar autenticado ou fornecer um ID anônimo",
        },
        { status: 400 },
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

    return NextResponse.json(
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
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving consent:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao salvar consentimento" },
      { status: 500 },
    );
  }
}
