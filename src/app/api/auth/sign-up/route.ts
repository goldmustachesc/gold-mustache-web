import { apiError, apiSuccess } from "@/lib/api/response";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validations/auth";

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
  const validationResult = signupSchema.safeParse(body);
  if (!validationResult.success) {
    return apiError(
      "VALIDATION_ERROR",
      validationResult.error.issues[0]?.message || "Dados inválidos",
      400,
      validationResult.error.issues,
    );
  }

  const { email, password, fullName, phone } = validationResult.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
    },
  });

  if (error) {
    return apiError(
      error.code ?? "AUTH_ERROR",
      error.message,
      error.status ?? 400,
    );
  }

  return apiSuccess({ user: data.user, session: data.session });
}
