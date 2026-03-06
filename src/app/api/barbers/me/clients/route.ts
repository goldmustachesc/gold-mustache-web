import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, apiCollection } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { normalizePhoneDigits } from "@/lib/booking/phone";
import { z } from "zod";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";

export interface ClientData {
  id: string;
  fullName: string;
  phone: string;
  type: "registered" | "guest";
  appointmentCount: number;
  lastAppointment: string | null;
}

const createClientSchema = z.object({
  fullName: z
    .string()
    .min(1, "Nome é obrigatório")
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 11;
      },
      { message: "Telefone deve ter 10 ou 11 dígitos" },
    ),
});

/**
 * GET /api/barbers/me/clients
 * Lists clients (registered and guests) who have booked appointments.
 * Query params: search, page, limit
 */
export async function GET(request: Request) {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const { page, limit, skip } = parsePagination(searchParams);

    const searchFilter = search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const clientSelect = {
      id: true,
      fullName: true,
      phone: true,
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { date: "desc" as const },
        take: 1,
        select: { date: true },
      },
    };

    const registeredWhere = { appointments: { some: {} }, ...searchFilter };
    const guestWhere = { appointments: { some: {} }, ...searchFilter };

    const [registeredClients, guestClients, registeredCount, guestCount] =
      await Promise.all([
        prisma.profile.findMany({
          where: registeredWhere,
          select: clientSelect,
          orderBy: { fullName: "asc" },
          take: skip + limit,
        }),
        prisma.guestClient.findMany({
          where: guestWhere,
          select: clientSelect,
          orderBy: { fullName: "asc" },
          take: skip + limit,
        }),
        prisma.profile.count({ where: registeredWhere }),
        prisma.guestClient.count({ where: guestWhere }),
      ]);

    const allClients: ClientData[] = [
      ...registeredClients.map((client) => ({
        id: client.id,
        fullName: client.fullName || "Cliente",
        phone: client.phone || "",
        type: "registered" as const,
        appointmentCount: client._count.appointments,
        lastAppointment: client.appointments[0]?.date
          ? client.appointments[0].date.toISOString().split("T")[0]
          : null,
      })),
      ...guestClients.map((client) => ({
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        type: "guest" as const,
        appointmentCount: client._count.appointments,
        lastAppointment: client.appointments[0]?.date
          ? client.appointments[0].date.toISOString().split("T")[0]
          : null,
      })),
    ];

    allClients.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const total = registeredCount + guestCount;
    const paged = allClients.slice(skip, skip + limit);

    return apiCollection(paged, paginationMeta(total, page, limit));
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar clientes");
  }
}

/**
 * POST /api/barbers/me/clients
 * Creates a new guest client (for clients without account)
 */
export async function POST(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const validation = createClientSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        validation.error.issues[0]?.message || "Dados inválidos",
        400,
      );
    }

    const { fullName, phone } = validation.data;
    const normalizedPhone = normalizePhoneDigits(phone);

    const existingGuest = await prisma.guestClient.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingGuest) {
      return apiError("PHONE_EXISTS", "Este telefone já está cadastrado", 409);
    }

    const existingProfile = await prisma.profile.findFirst({
      where: { phone: normalizedPhone },
    });

    if (existingProfile) {
      return apiError(
        "PHONE_EXISTS",
        "Este telefone já está cadastrado para um cliente",
        409,
      );
    }

    const newClient = await prisma.guestClient.create({
      data: {
        fullName: fullName.trim(),
        phone: normalizedPhone,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
      },
    });

    const clientData: ClientData = {
      id: newClient.id,
      fullName: newClient.fullName,
      phone: newClient.phone,
      type: "guest",
      appointmentCount: 0,
      lastAppointment: null,
    };

    return apiSuccess(clientData, 201);
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar cliente");
  }
}
