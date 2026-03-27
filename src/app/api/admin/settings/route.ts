import { revalidateTag } from "next/cache";
import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { BARBERSHOP_SETTINGS_CACHE_TAG } from "@/services/barbershop-settings";
import { z } from "zod";

const updateSettingsSchema = z
  .object({
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
    featuredEnabled: z.boolean().optional(),
    featuredBadge: z.string().min(1).max(50).optional(),
    featuredTitle: z.string().min(1).max(100).optional(),
    featuredDescription: z.string().min(1).max(300).optional(),
    featuredDuration: z.string().min(1).max(100).optional(),
    featuredOriginalPrice: z.number().positive().optional(),
    featuredDiscountedPrice: z.number().positive().optional(),
    foundingYear: z.number().min(1900).max(2100).optional(),
  })
  .refine(
    (data) => {
      if (
        data.featuredOriginalPrice !== undefined &&
        data.featuredDiscountedPrice !== undefined
      ) {
        return data.featuredDiscountedPrice <= data.featuredOriginalPrice;
      }
      return true;
    },
    {
      message: "Preço promocional deve ser menor ou igual ao preço original",
      path: ["featuredDiscountedPrice"],
    },
  );

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

    return apiSuccess(settings);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar configurações");
  }
}

/**
 * PUT /api/admin/settings
 * Atualiza as configurações da barbearia (apenas admin)
 */
export async function PUT(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
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
      return apiError("INVALID_JSON", "Corpo da requisição inválido", 400);
    }

    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        parsed.error.flatten(),
      );
    }

    const settings = await prisma.barbershopSettings.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });

    revalidateTag(BARBERSHOP_SETTINGS_CACHE_TAG, "max");

    return apiSuccess(settings);
  } catch (error) {
    return handlePrismaError(error, "Erro ao atualizar configurações");
  }
}
