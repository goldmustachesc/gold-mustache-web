import { apiError, apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getReleaseInfo } from "@/lib/release-info";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return apiError("CONFIG_ERROR", "Cron secret não configurado", 500);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const releaseInfo = await getReleaseInfo();
    return apiSuccess(releaseInfo);
  } catch (error) {
    return handlePrismaError(error, "Erro ao obter informações de release");
  }
}
