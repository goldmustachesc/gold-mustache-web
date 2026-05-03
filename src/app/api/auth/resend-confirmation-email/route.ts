import { apiError, apiSuccess } from "@/lib/api/response";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { resetSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const rateLimitResult = await checkRateLimit(
    "sensitive",
    getClientIdentifier(request),
  );
  if (!rateLimitResult.success) {
    return apiError(
      "RATE_LIMITED",
      "Muitas requisições. Tente novamente em 1 minuto.",
      429,
    );
  }

  const body = await request.json().catch(() => null);
  const validationResult = resetSchema.safeParse(body);
  if (!validationResult.success) {
    return apiError(
      "VALIDATION_ERROR",
      validationResult.error.issues[0]?.message || "Dados inválidos",
      400,
      validationResult.error.issues,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: validationResult.data.email,
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
