import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { z } from "zod";

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  shortName: z.string().min(1).max(50).optional(),
  tagline: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  street: z.string().min(1).max(100).optional(),
  number: z.string().min(1).max(20).optional(),
  neighborhood: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(2).max(2).optional(),
  zipCode: z.string().min(8).max(10).optional(),
  country: z.string().min(2).max(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().min(10).max(20).optional(),
  whatsapp: z.string().min(10).max(20).optional(),
  email: z.string().email().optional(),
  instagramMain: z.string().max(50).optional(),
  instagramStore: z.string().max(50).nullable().optional(),
  googleMapsUrl: z.string().url().nullable().optional(),
  bookingEnabled: z.boolean().optional(),
  externalBookingUrl: z.string().url().nullable().optional(),
  foundingYear: z.number().min(1900).max(2100).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * GET /api/admin/settings
 * Retorna as configurações da barbearia
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    let settings = await prisma.barbershopSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.barbershopSettings.create({
        data: { id: "default" },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching barbershop settings:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar configurações" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/settings
 * Atualiza as configurações da barbearia (apenas admin)
 */
export async function PUT(request: Request) {
  try {
    // Verifica se o usuário é admin
    const admin = await requireAdmin();
    if (!admin.ok) {
      // Log failed admin attempt for security monitoring
      console.warn("Failed admin settings update attempt", {
        ip: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date().toISOString(),
      });
      return admin.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json(
        {
          error: "INVALID_JSON",
          message: "Corpo da requisição inválido",
        },
        { status: 400 },
      );
    }

    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const settings = await prisma.barbershopSettings.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });

    // Invalidate cache only after successful database operation
    // Note: revalidateTag requires 2 arguments in Next.js 16+, but we'll skip cache invalidation for now
    // revalidateTag(BARBERSHOP_SETTINGS_CACHE_TAG, "force");

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating barbershop settings:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao atualizar configurações" },
      { status: 500 },
    );
  }
}
