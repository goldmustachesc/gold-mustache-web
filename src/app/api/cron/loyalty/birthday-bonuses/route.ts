import { apiError, apiSuccess } from "@/lib/api/response";
import { BirthdayService } from "@/services/loyalty/birthday.service";
import { runLoyaltyCron } from "../_shared";

export async function POST(request: Request): Promise<Response> {
  return runLoyaltyCron(request, "birthday-bonuses", () =>
    BirthdayService.creditBirthdayBonuses(),
  );
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
      "Use POST com Authorization: Bearer {CRON_SECRET} para creditar aniversários",
    dev: "curl -X POST http://localhost:3001/api/cron/loyalty/birthday-bonuses -H 'Authorization: Bearer {seu_cron_secret}'",
  });
}
