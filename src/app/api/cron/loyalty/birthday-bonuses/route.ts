import { BirthdayService } from "@/services/loyalty/birthday.service";
import { runLoyaltyCron } from "../_shared";

export async function POST(request: Request): Promise<Response> {
  return runLoyaltyCron(request, "birthday-bonuses", () =>
    BirthdayService.creditBirthdayBonuses(),
  );
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
