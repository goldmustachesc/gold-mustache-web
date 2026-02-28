import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  createAdminServiceSchema,
  generateSlug,
} from "@/lib/validations/service";
import { API_CONFIG } from "@/config/api";

/**
 * GET /api/admin/services
 * List all services (including inactive ones) for admin management
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const services = await prisma.service.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    return apiSuccess(
      services.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: Number(s.price),
        active: s.active,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar serviços");
  }
}

/**
 * POST /api/admin/services
 * Create a new service
 * Protected by Origin verification for CSRF protection.
 */
export async function POST(request: Request) {
  // CSRF protection
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    // Parse JSON body with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", "Corpo da requisição inválido", 400);
    }

    const validation = createAdminServiceSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const { name, description, duration, price } = validation.data;

    // Generate slug from name
    const baseSlug = generateSlug(name);

    const MAX_SLUG_ATTEMPTS = API_CONFIG.slugGeneration.maxAttempts;
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.service.findUnique({ where: { slug } })) {
      if (counter >= MAX_SLUG_ATTEMPTS) {
        return apiError(
          "SLUG_GENERATION_ERROR",
          "Não foi possível gerar um identificador único",
          500,
        );
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const service = await prisma.service.create({
      data: {
        slug,
        name,
        description: description ?? null,
        duration,
        price,
        active: true,
      },
    });

    return apiSuccess(
      {
        id: service.id,
        slug: service.slug,
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: Number(service.price),
        active: service.active,
        createdAt: service.createdAt.toISOString(),
        updatedAt: service.updatedAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar serviço");
  }
}
