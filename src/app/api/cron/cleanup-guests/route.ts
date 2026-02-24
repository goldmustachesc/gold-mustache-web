import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/cleanup-guests
 *
 * Cron job to anonymize old guest data for LGPD compliance.
 * Runs periodically (recommended: weekly) to clean up:
 * - Guests without appointments in the last 2 years
 * - Guests marked for deletion
 *
 * This maintains referential integrity by anonymizing rather than deleting.
 *
 * Protected by CRON_SECRET header.
 */
export async function POST(request: Request) {
  try {
    // Validate authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: "Cron secret não configurado" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Calculate the cutoff date (2 years ago)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Find guests to anonymize:
    // 1. Guests with no appointments in the last 2 years
    // 2. Guests whose phone starts with "DELETED_" (already processed - skip)
    const guestsToAnonymize = await prisma.guestClient.findMany({
      where: {
        // Not already anonymized
        NOT: {
          phone: {
            startsWith: "DELETED_",
          },
        },
        // No recent appointments
        appointments: {
          none: {
            date: {
              gte: twoYearsAgo,
            },
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (guestsToAnonymize.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum guest para limpar",
        anonymized: 0,
      });
    }

    // Anonymize in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    let totalAnonymized = 0;

    for (let i = 0; i < guestsToAnonymize.length; i += BATCH_SIZE) {
      const batch = guestsToAnonymize.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(
        batch.map((guest) =>
          prisma.guestClient.update({
            where: { id: guest.id },
            data: {
              fullName: "[DADOS REMOVIDOS POR INATIVIDADE]",
              phone: `DELETED_${guest.id}`,
              accessToken: null,
            },
          }),
        ),
      );

      totalAnonymized += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Limpeza concluída com sucesso`,
      anonymized: totalAnonymized,
      cutoffDate: twoYearsAgo.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro durante a limpeza" },
      { status: 500 },
    );
  }
}
