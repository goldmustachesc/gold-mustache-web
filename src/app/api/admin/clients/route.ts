import { prisma } from "@/lib/prisma";
import { apiCollection, apiError } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { checkRateLimit } from "@/lib/rate-limit";

export interface AdminClientData {
  id: string;
  fullName: string;
  phone: string;
  type: "registered" | "guest";
}

type ClientFilterType = "all" | "registered" | "guest";

function mapRegisteredClientData(profile: {
  id: string;
  fullName: string | null;
  phone: string | null;
}): AdminClientData {
  return {
    id: profile.id,
    fullName: profile.fullName || "Cliente",
    phone: profile.phone || "",
    type: "registered",
  };
}

function mapGuestClientData(guest: {
  id: string;
  fullName: string;
  phone: string;
}): AdminClientData {
  return {
    id: guest.id,
    fullName: guest.fullName || "Cliente",
    phone: guest.phone || "",
    type: "guest",
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const rl = await checkRateLimit("adminClients", auth.profileId);
    if (!rl.success) {
      return apiError(
        "RATE_LIMIT_EXCEEDED",
        "Limite de requisições excedido",
        429,
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const typeParam = searchParams.get("type") ?? "all";
    if (!["all", "registered", "guest"].includes(typeParam)) {
      return apiError("VALIDATION_ERROR", "Tipo de cliente inválido", 400);
    }
    const type = typeParam as ClientFilterType;
    const { page, limit, skip } = parsePagination(searchParams);

    const searchFilter = search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const selectFields = { id: true, fullName: true, phone: true };

    if (type === "registered") {
      const [profiles, total] = await Promise.all([
        prisma.profile.findMany({
          where: searchFilter,
          select: selectFields,
          orderBy: { fullName: "asc" },
          skip,
          take: limit,
        }),
        prisma.profile.count({ where: searchFilter }),
      ]);

      return apiCollection(
        profiles.map(mapRegisteredClientData),
        paginationMeta(total, page, limit),
      );
    }

    if (type === "guest") {
      const [guests, total] = await Promise.all([
        prisma.guestClient.findMany({
          where: searchFilter,
          select: selectFields,
          orderBy: { fullName: "asc" },
          skip,
          take: limit,
        }),
        prisma.guestClient.count({ where: searchFilter }),
      ]);

      return apiCollection(
        guests.map(mapGuestClientData),
        paginationMeta(total, page, limit),
      );
    }

    const [profiles, guests, profilesTotal, guestsTotal] = await Promise.all([
      prisma.profile.findMany({
        where: searchFilter,
        select: selectFields,
        orderBy: { fullName: "asc" },
        take: skip + limit,
      }),
      prisma.guestClient.findMany({
        where: searchFilter,
        select: selectFields,
        orderBy: { fullName: "asc" },
        take: skip + limit,
      }),
      prisma.profile.count({ where: searchFilter }),
      prisma.guestClient.count({ where: searchFilter }),
    ]);

    const all: AdminClientData[] = [
      ...profiles.map(mapRegisteredClientData),
      ...guests.map(mapGuestClientData),
    ];

    all.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const paged = all.slice(skip, skip + limit);
    return apiCollection(
      paged,
      paginationMeta(profilesTotal + guestsTotal, page, limit),
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar clientes");
  }
}
