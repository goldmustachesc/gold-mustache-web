import { z } from "zod";
import { apiCollection, apiError } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { paginationMeta } from "@/lib/api/pagination";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listAdminAuditLogs } from "@/services/admin-audit";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().trim().min(1).optional(),
  resourceType: z.string().trim().min(1).optional(),
  actorProfileId: z.string().uuid().optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

function parseQueryDate(
  value: string | undefined,
  boundary: "start" | "endExclusive",
): Date | undefined {
  if (!value) return undefined;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (boundary === "endExclusive") {
      date.setUTCDate(date.getUTCDate() + 1);
    }
    return date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "50",
      action: searchParams.get("action") ?? undefined,
      resourceType: searchParams.get("resourceType") ?? undefined,
      actorProfileId: searchParams.get("actorProfileId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!parsedQuery.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Parâmetros inválidos para auditoria",
        400,
        parsedQuery.error.flatten().fieldErrors,
      );
    }

    const from = parseQueryDate(parsedQuery.data.from, "start");
    const to = parseQueryDate(parsedQuery.data.to, "endExclusive");

    if (
      (parsedQuery.data.from && !from) ||
      (parsedQuery.data.to && !to) ||
      (from && to && from >= to)
    ) {
      return apiError(
        "VALIDATION_ERROR",
        "Intervalo de datas inválido para auditoria",
        400,
      );
    }

    const result = await listAdminAuditLogs({
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
      action: parsedQuery.data.action,
      resourceType: parsedQuery.data.resourceType,
      actorProfileId: parsedQuery.data.actorProfileId,
      from,
      to,
    });

    return apiCollection(
      result.items,
      paginationMeta(
        result.total,
        parsedQuery.data.page,
        parsedQuery.data.limit,
      ),
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar logs de auditoria");
  }
}
