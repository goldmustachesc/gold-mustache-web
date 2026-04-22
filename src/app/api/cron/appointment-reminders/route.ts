import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/services/feature-flags";
import {
  APPOINTMENT_REMINDER_CRON_LOCK_KEY,
  processAppointmentReminders,
} from "@/services/appointment-reminders";

interface LockRow {
  locked: boolean;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return apiError("CONFIG_ERROR", "Cron secret não configurado", 500);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const enabled = await isFeatureEnabled("appointmentReminders");
    if (!enabled) {
      return apiSuccess({
        skipped: true,
        reason: "appointmentReminders disabled",
      });
    }

    const lockRows = await prisma.$queryRaw<LockRow[]>`
      SELECT pg_try_advisory_lock(${APPOINTMENT_REMINDER_CRON_LOCK_KEY}) AS locked
    `;
    const lock = lockRows[0]?.locked ?? false;

    if (!lock) {
      return apiSuccess({
        skipped: true,
        reason: "already_running",
      });
    }

    try {
      const result = await processAppointmentReminders();
      return apiSuccess(result);
    } finally {
      await prisma.$executeRaw`
        SELECT pg_advisory_unlock(${APPOINTMENT_REMINDER_CRON_LOCK_KEY})
      `;
    }
  } catch (error) {
    return handlePrismaError(error, "Erro no cron de lembretes");
  }
}

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return apiError(
      "METHOD_NOT_ALLOWED",
      "Método não permitido em produção",
      405,
    );
  }

  return apiSuccess({
    message:
      "Use POST com Authorization: Bearer {CRON_SECRET} para processar lembretes automáticos",
    dev: "curl -X POST http://localhost:3001/api/cron/appointment-reminders -H 'Authorization: Bearer {seu_cron_secret}'",
  });
}
