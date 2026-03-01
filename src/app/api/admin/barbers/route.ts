import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { findAuthUserByEmail } from "@/lib/supabase/admin";
import { z } from "zod";

const createBarberSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("Email inválido"),
  avatarUrl: z.string().url().nullable().optional(),
});

export type CreateBarberInput = z.infer<typeof createBarberSchema>;

/**
 * GET /api/admin/barbers
 * Lista todos os barbeiros (ativos e inativos)
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const barbers = await prisma.barber.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        avatarUrl: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return apiSuccess(barbers);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar barbeiros");
  }
}

/**
 * POST /api/admin/barbers
 * Cria um novo barbeiro vinculado a um usuário existente (por email)
 */
export async function POST(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const body = await request.json();
    const parsed = createBarberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        parsed.error.flatten(),
      );
    }

    const { name, email, avatarUrl } = parsed.data;

    let userId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const authUser = await findAuthUserByEmail(email);

    if (authUser) {
      const existingBarberByUser = await prisma.barber.findUnique({
        where: { userId: authUser.id },
      });
      if (existingBarberByUser) {
        return apiError(
          "DUPLICATE",
          "Já existe um barbeiro vinculado a este email",
          409,
        );
      }
      userId = authUser.id;
    }

    const barber = await prisma.barber.create({
      data: {
        userId,
        name,
        avatarUrl: avatarUrl ?? null,
        active: true,
      },
    });

    return apiSuccess(barber, 201);
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar barbeiro");
  }
}
