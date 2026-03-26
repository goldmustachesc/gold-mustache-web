import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess } from "@/lib/api/response";
import { BirthdayService } from "@/services/loyalty/birthday.service";

export async function POST(req: Request) {
  const originError = requireValidOrigin(req);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const result = await BirthdayService.creditBirthdayBonuses();

    return apiSuccess(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao processar bônus de aniversário");
  }
}
