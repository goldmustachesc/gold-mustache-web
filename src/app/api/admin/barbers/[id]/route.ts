import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { z } from "zod";

const serviceEntrySchema = z.object({
  serviceId: z.string().uuid(),
  durationOverride: z
    .number()
    .int()
    .min(5, "Duração mínima é 5 minutos")
    .max(240, "Duração máxima é 240 minutos")
    .refine((v) => v % 5 === 0, { message: "Duração deve ser múltiplo de 5" })
    .nullable()
    .optional()
    .default(null),
});

const updateBarberSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(100)
      .optional(),
    avatarUrl: z.string().url().nullable().optional(),
    active: z.boolean().optional(),
    services: z.array(serviceEntrySchema).optional(),
    serviceIds: z.array(z.string().uuid()).optional(),
  })
  .refine((d) => !(d.services !== undefined && d.serviceIds !== undefined), {
    message: "Use 'services' (com durationOverride) ou 'serviceIds', não ambos",
    path: ["services"],
  });

export type UpdateBarberInput = z.infer<typeof updateBarberSchema>;

/**
 * GET /api/admin/barbers/[id]
 * Retorna detalhes de um barbeiro específico
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;

    const barber = await prisma.barber.findUnique({
      where: { id },
      include: {
        services: {
          select: {
            serviceId: true,
            durationOverride: true,
            service: {
              select: {
                id: true,
                name: true,
                duration: true,
                price: true,
                active: true,
              },
            },
          },
        },
        _count: {
          select: {
            appointments: true,
            workingHours: true,
          },
        },
      },
    });

    if (!barber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    return apiSuccess(barber);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar barbeiro");
  }
}

/**
 * PUT /api/admin/barbers/[id]
 * Atualiza um barbeiro
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBarberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        parsed.error.flatten(),
      );
    }

    const existingBarber = await prisma.barber.findUnique({
      where: { id },
    });

    if (!existingBarber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    const { services: servicesInput, serviceIds, ...barberData } = parsed.data;

    const effectiveServices =
      servicesInput ??
      serviceIds?.map((serviceId) => ({
        serviceId,
        durationOverride: null as null,
      }));

    if (effectiveServices !== undefined) {
      const seen = new Map<
        string,
        { serviceId: string; durationOverride: number | null }
      >();
      for (const entry of effectiveServices) {
        seen.set(entry.serviceId, {
          serviceId: entry.serviceId,
          durationOverride: entry.durationOverride ?? null,
        });
      }
      const uniqueServices = Array.from(seen.values());
      const uniqueServiceIds = uniqueServices.map((s) => s.serviceId);

      const existingServices = await prisma.service.findMany({
        where: { id: { in: uniqueServiceIds } },
        select: { id: true },
      });

      if (existingServices.length !== uniqueServiceIds.length) {
        return apiError(
          "INVALID_SERVICES",
          "Um ou mais serviços informados não existem",
          400,
        );
      }

      await prisma.$transaction(async (tx) => {
        if (Object.keys(barberData).length > 0) {
          await tx.barber.update({
            where: { id },
            data: barberData,
          });
        }

        await tx.barberService.deleteMany({
          where: { barberId: id },
        });

        if (uniqueServices.length > 0) {
          await tx.barberService.createMany({
            data: uniqueServices.map(({ serviceId, durationOverride }) => ({
              barberId: id,
              serviceId,
              durationOverride,
            })),
          });
        }
      });

      const updatedBarber = await prisma.barber.findUnique({
        where: { id },
        include: {
          services: {
            select: {
              serviceId: true,
              durationOverride: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  duration: true,
                  price: true,
                  active: true,
                },
              },
            },
          },
          _count: {
            select: {
              appointments: true,
              workingHours: true,
            },
          },
        },
      });

      return apiSuccess(updatedBarber);
    }

    const barber = await prisma.barber.update({
      where: { id },
      data: barberData,
    });

    return apiSuccess(barber);
  } catch (error) {
    return handlePrismaError(error, "Erro ao atualizar barbeiro");
  }
}

/**
 * DELETE /api/admin/barbers/[id]
 * Remove um barbeiro (soft delete - apenas desativa)
 * Ou hard delete se não tiver agendamentos
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;

    const barber = await prisma.barber.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!barber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    // Se tem agendamentos, apenas desativa (soft delete)
    if (barber._count.appointments > 0) {
      await prisma.barber.update({
        where: { id },
        data: { active: false },
      });

      return apiSuccess({
        softDelete: true,
        message:
          "Barbeiro desativado (mantido no histórico devido aos agendamentos)",
      });
    }

    // Se não tem agendamentos, pode remover completamente
    // Primeiro remove os dados relacionados
    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { barberId: id } }),
      prisma.barberService.deleteMany({ where: { barberId: id } }),
      prisma.barberAbsence.deleteMany({ where: { barberId: id } }),
      prisma.barber.delete({ where: { id } }),
    ]);

    return apiSuccess({
      softDelete: false,
      message: "Barbeiro removido com sucesso",
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao remover barbeiro");
  }
}
