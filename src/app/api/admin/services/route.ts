import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import {
  createAdminServiceSchema,
  generateSlug,
} from "@/lib/validations/service";

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

    return NextResponse.json({
      services: services.map((s) => ({
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
    });
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
      return NextResponse.json(
        { error: "INVALID_JSON", message: "Corpo da requisição inválido" },
        { status: 400 },
      );
    }

    const validation = createAdminServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { name, description, duration, price } = validation.data;

    // Generate slug from name
    const baseSlug = generateSlug(name);

    // Check for slug uniqueness, append number if needed (max 100 attempts)
    const MAX_SLUG_ATTEMPTS = 100;
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.service.findUnique({ where: { slug } })) {
      if (counter >= MAX_SLUG_ATTEMPTS) {
        return NextResponse.json(
          {
            error: "SLUG_GENERATION_ERROR",
            message: "Não foi possível gerar um identificador único",
          },
          { status: 500 },
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

    return NextResponse.json(
      {
        service: {
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
      },
      { status: 201 },
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar serviço");
  }
}
