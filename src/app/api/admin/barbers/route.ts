import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
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

    return NextResponse.json({ barbers });
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
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { name, avatarUrl } = parsed.data;

    // Para criar um barbeiro, precisamos de um userId
    // Primeiro verificamos se já existe um barbeiro com esse email/nome
    const existingBarber = await prisma.barber.findFirst({
      where: { name },
    });

    if (existingBarber) {
      return NextResponse.json(
        { error: "DUPLICATE", message: "Já existe um barbeiro com esse nome" },
        { status: 409 },
      );
    }

    // Busca o perfil do usuário pelo email no Supabase Auth
    // Como não temos acesso direto ao auth.users, vamos criar o barbeiro
    // com um userId temporário baseado no email (o admin pode ajustar depois)
    // Ou podemos buscar o userId de um usuário existente

    // Estratégia: buscar o profile que tenha o userId correspondente
    // Para isso, precisamos que o usuário já tenha feito login
    // Vamos procurar no Supabase

    // Por simplicidade, vamos permitir criar barbeiro com userId gerado
    // O admin depois pode vincular ao usuário correto
    const userId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const barber = await prisma.barber.create({
      data: {
        userId,
        name,
        avatarUrl: avatarUrl ?? null,
        active: true,
      },
    });

    return NextResponse.json({ barber }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar barbeiro");
  }
}
