import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import {
  updateAdminServiceSchema,
  generateSlug,
} from "@/lib/validations/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/services/[id]
 * Get a single service by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;

  try {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Serviço não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar serviço");
  }
}

/**
 * PUT /api/admin/services/[id]
 * Update an existing service
 * Protected by Origin verification for CSRF protection.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  // CSRF protection
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;

  try {
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Serviço não encontrado" },
        { status: 404 },
      );
    }

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

    const validation = updateAdminServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { name, description, duration, price, active } = validation.data;

    // Build update data
    const updateData: {
      name?: string;
      slug?: string;
      description?: string | null;
      duration?: number;
      price?: number;
      active?: boolean;
    } = {};

    // If name is being updated, also update slug
    if (name !== undefined && name !== existingService.name) {
      const baseSlug = generateSlug(name);

      // Check for slug uniqueness (excluding current service, max 100 attempts)
      const MAX_SLUG_ATTEMPTS = 100;
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await prisma.service.findUnique({ where: { slug } });
        if (!existing || existing.id === id) break;
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

      updateData.name = name;
      updateData.slug = slug;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (duration !== undefined) {
      updateData.duration = duration;
    }

    if (price !== undefined) {
      updateData.price = price;
    }

    if (active !== undefined) {
      updateData.active = active;
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao atualizar serviço");
  }
}

/**
 * DELETE /api/admin/services/[id]
 * Soft delete (deactivate) a service
 * We don't actually delete to preserve appointment history
 * Protected by Origin verification for CSRF protection.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  // CSRF protection
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;

  try {
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Serviço não encontrado" },
        { status: 404 },
      );
    }

    // Soft delete by setting active to false
    const service = await prisma.service.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
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
      message: "Serviço desativado com sucesso",
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao desativar serviço");
  }
}
