import { ExpirationService } from "@/services/loyalty/expiration.service";
import { runLoyaltyCron } from "../_shared";

export async function POST(request: Request): Promise<Response> {
  return runLoyaltyCron(request, "expire-points", async () => {
    const result = await ExpirationService.expirePoints();
    await ExpirationService.notifyExpiringPoints();
    return result;
  });
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
