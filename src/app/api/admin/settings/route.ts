import { revalidateTag } from "next/cache";
import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { barbershopConfig } from "@/config/barbershop";
import { BARBERSHOP_SETTINGS_CACHE_TAG } from "@/services/barbershop-settings";
import { z } from "zod";

const FEATURED_SETTINGS_DEFAULTS = {
  enabled: true,
  badge: "Mais Popular",
  title: "Combo Completo",
  description:
    "Corte + Barba + Sobrancelha - O pacote completo para um visual impecável",
  duration: "Aproximadamente 60 minutos",
  originalPrice: "115",
  discountedPrice: "100",
} as const;

interface PrismaLikeMissingColumnError {
  code: string;
  meta?: {
    column?: string;
  };
}

interface LegacyBarbershopSettingsRow {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string | null;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagramMain: string;
  instagramStore: string | null;
  googleMapsUrl: string | null;
  bookingEnabled: boolean;
  externalBookingUrl: string | null;
  foundingYear: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CompatibleBarbershopSettingsResponse {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string | null;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagramMain: string;
  instagramStore: string | null;
  googleMapsUrl: string | null;
  bookingEnabled: boolean;
  externalBookingUrl: string | null;
  featuredEnabled: boolean;
  featuredBadge: string;
  featuredTitle: string;
  featuredDescription: string;
  featuredDuration: string;
  featuredOriginalPrice: string;
  featuredDiscountedPrice: string;
  foundingYear: number;
  createdAt: Date;
  updatedAt: Date;
}

function isMissingFeaturedColumnError(
  error: unknown,
): error is PrismaLikeMissingColumnError {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  if (error.code !== "P2022") {
    return false;
  }

  const meta = "meta" in error ? error.meta : undefined;
  if (!meta || typeof meta !== "object" || !("column" in meta)) {
    return false;
  }

  return (
    typeof meta.column === "string" &&
    meta.column.startsWith("barbershop_settings.featured_")
  );
}

function buildCompatibleSettingsResponse(
  legacyRow: LegacyBarbershopSettingsRow | null,
): CompatibleBarbershopSettingsResponse {
  const now = new Date();

  return {
    id: legacyRow?.id ?? "default",
    name: legacyRow?.name ?? barbershopConfig.name,
    shortName: legacyRow?.shortName ?? barbershopConfig.shortName,
    tagline: legacyRow?.tagline ?? barbershopConfig.tagline,
    description: legacyRow?.description ?? barbershopConfig.description,
    street: legacyRow?.street ?? barbershopConfig.address.street,
    number: legacyRow?.number ?? barbershopConfig.address.number,
    neighborhood:
      legacyRow?.neighborhood ?? barbershopConfig.address.neighborhood,
    city: legacyRow?.city ?? barbershopConfig.address.city,
    state: legacyRow?.state ?? barbershopConfig.address.state,
    zipCode: legacyRow?.zipCode ?? barbershopConfig.address.zipCode,
    country: legacyRow?.country ?? barbershopConfig.address.country,
    latitude: legacyRow?.latitude ?? String(barbershopConfig.coordinates.lat),
    longitude: legacyRow?.longitude ?? String(barbershopConfig.coordinates.lng),
    phone: legacyRow?.phone ?? barbershopConfig.contact.phone,
    whatsapp: legacyRow?.whatsapp ?? barbershopConfig.contact.whatsapp,
    email: legacyRow?.email ?? barbershopConfig.contact.email,
    instagramMain:
      legacyRow?.instagramMain ?? barbershopConfig.social.instagram.main,
    instagramStore:
      legacyRow?.instagramStore ?? barbershopConfig.social.instagram.store,
    googleMapsUrl:
      legacyRow?.googleMapsUrl ?? barbershopConfig.social.googleMaps,
    bookingEnabled: legacyRow?.bookingEnabled ?? true,
    externalBookingUrl:
      legacyRow?.externalBookingUrl ??
      barbershopConfig.externalBooking.inbarberUrl,
    featuredEnabled: FEATURED_SETTINGS_DEFAULTS.enabled,
    featuredBadge: FEATURED_SETTINGS_DEFAULTS.badge,
    featuredTitle: FEATURED_SETTINGS_DEFAULTS.title,
    featuredDescription: FEATURED_SETTINGS_DEFAULTS.description,
    featuredDuration: FEATURED_SETTINGS_DEFAULTS.duration,
    featuredOriginalPrice: FEATURED_SETTINGS_DEFAULTS.originalPrice,
    featuredDiscountedPrice: FEATURED_SETTINGS_DEFAULTS.discountedPrice,
    foundingYear: legacyRow?.foundingYear ?? barbershopConfig.foundingYear,
    createdAt: legacyRow?.createdAt ?? now,
    updatedAt: legacyRow?.updatedAt ?? now,
  };
}

async function getLegacyCompatibleSettings(): Promise<CompatibleBarbershopSettingsResponse> {
  try {
    const rows = await prisma.$queryRaw<LegacyBarbershopSettingsRow[]>`
  SELECT
    id,
    name,
    short_name AS "shortName",
    tagline,
    description,
    street,
    number,
    neighborhood,
    city,
    state,
    zip_code AS "zipCode",
    country,
    latitude::text AS "latitude",
    longitude::text AS "longitude",
    phone,
    whatsapp,
    email,
    instagram_main AS "instagramMain",
    instagram_store AS "instagramStore",
    google_maps_url AS "googleMapsUrl",
    booking_enabled AS "bookingEnabled",
    external_booking_url AS "externalBookingUrl",
    founding_year AS "foundingYear",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM "barbershop_settings"
  WHERE id = 'default'
  LIMIT 1
`;

    return buildCompatibleSettingsResponse(rows[0] ?? null);
  } catch (error) {
    console.error(
      "Failed to load legacy-compatible barbershop settings fallback:",
      error,
    );

    return buildCompatibleSettingsResponse(null);
  }
}

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
    if (isMissingFeaturedColumnError(error)) {
      console.warn(
        "Featured settings columns are missing in the database. Returning compatibility fallback for admin settings.",
      );

      return apiSuccess(await getLegacyCompatibleSettings());
    }

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
    if (isMissingFeaturedColumnError(error)) {
      return apiError(
        "SETTINGS_SCHEMA_OUTDATED",
        "Banco de dados desatualizado para as configurações de destaque. Aplique a migration pendente.",
        503,
      );
    }

    return handlePrismaError(error, "Erro ao atualizar configurações");
  }
}
