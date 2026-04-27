import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthUserEmailsByIds } from "@/lib/supabase/admin";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const LOYALTY_TIERS = ["BRONZE", "SILVER", "GOLD", "DIAMOND"] as const;

function parseTierParam(
  raw: string | null,
): (typeof LOYALTY_TIERS)[number] | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toUpperCase();
  return LOYALTY_TIERS.includes(normalized as (typeof LOYALTY_TIERS)[number])
    ? (normalized as (typeof LOYALTY_TIERS)[number])
    : undefined;
}

function buildWhere(search: string | undefined, tier: string | undefined) {
  const where: Prisma.LoyaltyAccountWhereInput = {};
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    where.profile = {
      fullName: { contains: trimmedSearch, mode: "insensitive" },
    };
  }
  const parsedTier = parseTierParam(tier ?? null);
  if (parsedTier) {
    where.tier = parsedTier;
  }
  return where;
}

function buildOrderBy(
  sortBy: string | null,
  sortOrder: "asc" | "desc",
): Prisma.LoyaltyAccountOrderByWithRelationInput {
  const key = sortBy?.trim().toLowerCase() ?? "";
  if (!key) {
    return { currentPoints: "desc" };
  }
  switch (key) {
    case "lifetimepoints":
      return { lifetimePoints: sortOrder };
    case "currentpoints":
      return { currentPoints: sortOrder };
    case "membersince":
    case "createdat":
      return { createdAt: sortOrder };
    case "tier":
      return { tier: sortOrder };
    case "fullname":
      return { profile: { fullName: sortOrder } };
    default:
      return { currentPoints: sortOrder };
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * limit;

    const search = url.searchParams.get("search") ?? undefined;
    const tier = url.searchParams.get("tier") ?? undefined;
    const sortBy = url.searchParams.get("sortBy");
    const sortOrderRaw = url.searchParams.get("sortOrder")?.toLowerCase();
    const sortOrder: "asc" | "desc" = sortOrderRaw === "asc" ? "asc" : "desc";

    const where = buildWhere(search, tier);
    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [accounts, total] = await Promise.all([
      prisma.loyaltyAccount.findMany({
        where,
        include: {
          profile: {
            select: { userId: true, fullName: true },
          },
          _count: {
            select: { redemptions: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.loyaltyAccount.count({ where }),
    ]);

    const userIds = accounts.map((acc) => acc.profile.userId);
    const emailMap = await getAuthUserEmailsByIds(userIds);

    const data = accounts.map((acc) => ({
      id: acc.id,
      userId: acc.profile.userId,
      fullName: acc.profile.fullName ?? "Sem nome",
      email: emailMap.get(acc.profile.userId) ?? "",
      points: acc.currentPoints,
      tier: acc.tier,
      lifetimePoints: acc.lifetimePoints,
      memberSince: acc.createdAt.toISOString(),
      redemptionCount: acc._count.redemptions,
    }));

    return apiSuccess({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar contas de fidelidade");
  }
}
