import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { apiError } from "@/lib/api/response";

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const originError = requireValidOrigin(request);
  if (originError) return originError;

  return apiError("NOT_IMPLEMENTED", "Reagendamento em breve", 501);
}
