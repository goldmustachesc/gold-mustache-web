import { apiError, apiSuccess } from "@/lib/api/response";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { newPasswordSchema } from "@/lib/validations/auth";
import { z } from "zod";

const updatePasswordSchema = z.object({
  password: newPasswordSchema.shape.password,
});

export async function POST(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "Não autorizado", 401);
  }

  const rateLimitResult = await checkRateLimit(
    "sensitive",
    getUserRateLimitIdentifier(user.id),
  );
  if (!rateLimitResult.success) {
    return apiError(
      "RATE_LIMITED",
      "Muitas requisições. Tente novamente em 1 minuto.",
      429,
    );
  }

  const body = await request.json().catch(() => null);
  const validationResult = updatePasswordSchema.safeParse(body);
  if (!validationResult.success) {
    return apiError(
      "VALIDATION_ERROR",
      validationResult.error.issues[0]?.message || "Dados inválidos",
      400,
      validationResult.error.issues,
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: validationResult.data.password,
  });

  if (error) {
    return apiError(
      error.code ?? "AUTH_ERROR",
      error.message,
      error.status ?? 400,
    );
  }

  return apiSuccess({ success: true });
}
