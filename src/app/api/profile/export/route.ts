import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

/**
 * GET /api/profile/export
 *
 * Exports all user data for LGPD portability compliance (Art. 18, V).
 * Returns a JSON file with:
 * - Profile information
 * - All appointments (past and future)
 * - Cookie consent preferences
 *
 * This endpoint is rate-limited to prevent abuse.
 */
export async function GET(request: Request) {
  try {
    // Rate limiting - sensitive operation
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("sensitive", clientId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Muitas requisições. Tente novamente em alguns minutos.",
        },
        { status: 429 },
      );
    }

    // Authenticate user
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

    // Fetch profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "PROFILE_NOT_FOUND", message: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // Fetch all appointments (including past ones)
    const appointments = await prisma.appointment.findMany({
      where: { clientId: profile.id },
      include: {
        barber: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
            duration: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Fetch cookie consents
    const cookieConsents = await prisma.cookieConsent.findMany({
      where: { userId: user.id },
      orderBy: { consentDate: "desc" },
    });

    // Build export data structure
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        format: "JSON",
        version: "1.0",
        description:
          "Exportação de dados pessoais conforme LGPD (Lei 13.709/2018)",
      },
      account: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        provider: user.app_metadata?.provider || "email",
      },
      profile: {
        id: profile.id,
        fullName: profile.fullName,
        phone: profile.phone,
        emailVerified: profile.emailVerified,
        role: profile.role,
        address: {
          street: profile.street,
          number: profile.number,
          complement: profile.complement,
          neighborhood: profile.neighborhood,
          city: profile.city,
          state: profile.state,
          zipCode: profile.zipCode,
        },
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      appointments: appointments.map((apt) => ({
        id: apt.id,
        date: apt.date.toISOString().split("T")[0],
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        cancelReason: apt.cancelReason,
        barber: apt.barber.name,
        service: {
          name: apt.service.name,
          price: Number(apt.service.price),
          duration: apt.service.duration,
        },
        createdAt: apt.createdAt.toISOString(),
      })),
      cookieConsents: cookieConsents.map((consent) => ({
        id: consent.id,
        analyticsConsent: consent.analyticsConsent,
        marketingConsent: consent.marketingConsent,
        consentDate: consent.consentDate.toISOString(),
        updatedAt: consent.updatedAt.toISOString(),
      })),
      summary: {
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter(
          (a) => a.status === "COMPLETED",
        ).length,
        cancelledAppointments: appointments.filter(
          (a) =>
            a.status === "CANCELLED_BY_CLIENT" ||
            a.status === "CANCELLED_BY_BARBER",
        ).length,
        totalConsentRecords: cookieConsents.length,
      },
    };

    // Return as downloadable JSON file
    const fileName = `gold-mustache-dados-${user.id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[Data Export] Error exporting user data:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao exportar dados" },
      { status: 500 },
    );
  }
}
