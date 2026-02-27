import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
 * Lists all clients (registered and guests) who have booked appointments at the barbershop
 * Query params:
 * - search: filter by name or phone
 */
export async function GET(request: Request) {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const registeredClients = await prisma.profile.findMany({
      where: {
        appointments: {
          some: {},
        },
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        _count: {
          select: { appointments: true },
        },
        appointments: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    });

    const guestClients = await prisma.guestClient.findMany({
      where: {
        appointments: {
          some: {},
        },
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        _count: {
          select: { appointments: true },
        },
        appointments: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    });

    const clients: ClientData[] = [
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

    clients.sort((a, b) => a.fullName.localeCompare(b.fullName));

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar clientes" },
      { status: 500 },
    );
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
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: validation.error.issues[0]?.message || "Dados inválidos",
        },
        { status: 400 },
      );
    }

    const { fullName, phone } = validation.data;
    const normalizedPhone = normalizePhoneDigits(phone);

    const existingGuest = await prisma.guestClient.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingGuest) {
      return NextResponse.json(
        {
          error: "PHONE_EXISTS",
          message: "Este telefone já está cadastrado",
        },
        { status: 409 },
      );
    }

    const existingProfile = await prisma.profile.findFirst({
      where: { phone: normalizedPhone },
    });

    if (existingProfile) {
      return NextResponse.json(
        {
          error: "PHONE_EXISTS",
          message: "Este telefone já está cadastrado para um cliente",
        },
        { status: 409 },
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

    return NextResponse.json({ client: clientData }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao criar cliente" },
      { status: 500 },
    );
  }
}
