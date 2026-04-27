import { apiError, apiMessage } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";
import { prisma } from "@/lib/prisma";

type DeleteScope = "occurrence" | "series";

function getDeleteScope(request: Request): DeleteScope | null {
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === null || scope === "occurrence") return "occurrence";
  if (scope === "series") return "series";
  return null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const scope = getDeleteScope(request);
    if (!scope) {
      return apiError("VALIDATION_ERROR", "Escopo de exclusão inválido.", 422);
    }

    const { id } = await params;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const absence = await prisma.barberAbsence.findUnique({
      where: { id },
      select: {
        id: true,
        barberId: true,
        date: true,
        recurrenceId: true,
      },
    });

    if (!absence || absence.barberId !== auth.barberId) {
      return apiError("NOT_FOUND", "Ausência não encontrada", 404);
    }

    if (scope === "series" && absence.recurrenceId) {
      await prisma.barberAbsence.deleteMany({
        where: {
          barberId: auth.barberId,
          recurrenceId: absence.recurrenceId,
          date: {
            gte: absence.date,
          },
        },
      });
      return apiMessage();
    }

    await prisma.barberAbsence.delete({ where: { id } });
    return apiMessage();
  } catch (error) {
    return handlePrismaError(error, "Erro ao remover ausência");
  }
}
