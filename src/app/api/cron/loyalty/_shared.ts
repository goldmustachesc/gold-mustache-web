import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { isFeatureEnabled } from "@/services/feature-flags";

export type CronJobName = "expire-points" | "birthday-bonuses";

export async function runLoyaltyCron<T extends object>(
  request: Request,
  jobName: CronJobName,
  job: () => Promise<T>,
): Promise<Response> {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return apiError("CONFIG_ERROR", "Cron secret não configurado", 500);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const enabled = await isFeatureEnabled("loyaltyProgram");
    if (!enabled) {
      return apiSuccess({ skipped: true, reason: "loyaltyProgram disabled" });
    }

    const t0 = performance.now();
    const result = await job();
    const durationMs = Math.round(performance.now() - t0);

    // durationMs last — overrides same-key from result intentionally
    const payload = { ...(result as Record<string, unknown>), durationMs };
    console.info(`[loyalty-cron] ${jobName}`, payload);

    return apiSuccess(payload);
  } catch (error) {
    // handlePrismaError already logs internally — no console.error here
    return handlePrismaError(error, "Erro no cron de fidelidade");
  }
}
