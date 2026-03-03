import { requireAdmin } from "@/lib/auth/requireAdmin";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess, apiError, apiCollection } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { deriveRedemptionStatus } from "@/lib/loyalty/status";
import type { RedemptionStatus } from "@/types/loyalty";
import type { Prisma } from "@prisma/client";

const VALID_STATUSES: RedemptionStatus[] = ["PENDING", "USED", "EXPIRED"];

function buildStatusFilter(
  status: RedemptionStatus,
): Prisma.RedemptionWhereInput {
  const now = new Date();
  switch (status) {
    case "PENDING":
      return { usedAt: null, expiresAt: { gte: now } };
    case "USED":
      return { usedAt: { not: null } };
    case "EXPIRED":
      return { usedAt: null, expiresAt: { lt: now } };
  }
}

const REDEMPTION_INCLUDE = {
  reward: { select: { name: true, type: true, value: true } },
  loyaltyAccount: {
    include: { profile: { select: { fullName: true, email: true } } },
  },
} as const;

function mapRedemptionToResponse(r: {
  id: string;
  code: string;
  pointsSpent: number;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  reward: { name: string; type: string; value: unknown };
  loyaltyAccount: {
    profile: { fullName: string | null; email: string | null };
  };
}) {
  return {
    id: r.id,
    code: r.code,
    pointsSpent: r.pointsSpent,
    usedAt: r.usedAt,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    status: deriveRedemptionStatus(r),
    clientName: r.loyaltyAccount.profile.fullName,
    clientEmail: r.loyaltyAccount.profile.email,
    rewardName: r.reward.name,
    rewardType: r.reward.type,
    rewardValue: r.reward.value,
  };
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    if (code) {
      const redemption = await prisma.redemption.findUnique({
        where: { code },
        include: REDEMPTION_INCLUDE,
      });

      if (!redemption) {
        return apiError("NOT_FOUND", "Código de resgate não encontrado", 404);
      }

      return apiSuccess(mapRedemptionToResponse(redemption));
    }

    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get("status");

    if (status && !VALID_STATUSES.includes(status as RedemptionStatus)) {
      return apiError("VALIDATION_ERROR", "Status inválido", 400);
    }

    const where: Prisma.RedemptionWhereInput = status
      ? buildStatusFilter(status as RedemptionStatus)
      : {};

    const [redemptions, total] = await Promise.all([
      prisma.redemption.findMany({
        where,
        include: REDEMPTION_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.redemption.count({ where }),
    ]);

    const items = redemptions.map(mapRedemptionToResponse);
    return apiCollection(items, paginationMeta(total, page, limit));
  } catch (error) {
    return handlePrismaError(error, "Erro ao listar resgates");
  }
}
