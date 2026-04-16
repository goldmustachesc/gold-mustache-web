import { apiError, apiSuccess } from "@/lib/api/response";
import { ExpirationService } from "@/services/loyalty/expiration.service";
import { runLoyaltyCron } from "../_shared";

export async function POST(request: Request): Promise<Response> {
  return runLoyaltyCron(request, "expire-points", async () => {
    const result = await ExpirationService.expirePoints();
    await ExpirationService.notifyExpiringPoints();
    return result;
  });
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
      "Use POST com Authorization: Bearer {CRON_SECRET} para expirar pontos",
    dev: "curl -X POST http://localhost:3001/api/cron/loyalty/expire-points -H 'Authorization: Bearer {seu_cron_secret}'",
  });
}
