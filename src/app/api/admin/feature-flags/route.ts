import { revalidateTag } from "next/cache";
import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import {
  FEATURE_FLAGS_CACHE_TAG,
  getResolvedFeatureFlags,
} from "@/services/feature-flags";
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_REGISTRY,
  type FeatureFlagKey,
} from "@/config/feature-flags";
import { z } from "zod";

const flagsShape = Object.fromEntries(
  FEATURE_FLAG_KEYS.map((key) => [key, z.boolean().optional()]),
) as Record<FeatureFlagKey, z.ZodOptional<z.ZodBoolean>>;

const updateFeatureFlagsSchema = z.object({
  flags: z.object(flagsShape).strict(),
});

export type UpdateFeatureFlagsInput = z.infer<typeof updateFeatureFlagsSchema>;

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const flags = await getResolvedFeatureFlags();
    return apiSuccess({ flags });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar feature flags");
  }
}

export async function PUT(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      console.warn("Failed admin feature flags update attempt", {
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

    const parsed = updateFeatureFlagsSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        parsed.error.flatten(),
      );
    }

    const entries = Object.entries(parsed.data.flags).filter(
      (entry): entry is [FeatureFlagKey, boolean] =>
        typeof entry[1] === "boolean",
    );

    for (const [key, enabled] of entries) {
      const def = FEATURE_FLAG_REGISTRY[key];
      await prisma.featureFlag.upsert({
        where: { key },
        create: {
          key,
          enabled,
          description: def.description,
        },
        update: { enabled },
      });
    }

    revalidateTag(FEATURE_FLAGS_CACHE_TAG, "max");

    const flags = await getResolvedFeatureFlags();
    return apiSuccess({ flags });
  } catch (error) {
    return handlePrismaError(error, "Erro ao atualizar feature flags");
  }
}
