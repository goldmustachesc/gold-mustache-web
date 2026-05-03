import { getDateAvailabilityRange } from "@/services/booking";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getDateAvailabilityRangeQuerySchema } from "@/lib/validations/booking";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseAuthCookieName } from "@/lib/supabase/cookie-presence";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("api", clientId);
    if (!rateLimitResult.success) {
      const res = apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
      res.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
      res.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));
      return res;
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const barberId = searchParams.get("barberId");
    const serviceId = searchParams.get("serviceId");

    const validation = getDateAvailabilityRangeQuerySchema.safeParse({
      from,
      to,
      barberId,
      serviceId: serviceId ?? undefined,
    });

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Parâmetros inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const cookieStore = await cookies();
    const hasAuthCookie = hasSupabaseAuthCookieName(
      cookieStore.getAll().map((c) => c.name),
    );

    let profile: { id: string } | null = null;
    if (hasAuthCookie) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      profile = user
        ? await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { id: true },
          })
        : null;
    }

    const result = await getDateAvailabilityRange(
      parseIsoDateYyyyMmDdAsSaoPauloDate(validation.data.from),
      parseIsoDateYyyyMmDdAsSaoPauloDate(validation.data.to),
      validation.data.barberId,
      validation.data.serviceId ?? null,
      { clientId: profile?.id },
    );

    const response = apiSuccess(result);
    response.headers.set(
      "Cache-Control",
      profile
        ? "private, no-store"
        : "public, s-maxage=60, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar disponibilidade");
  }
}
