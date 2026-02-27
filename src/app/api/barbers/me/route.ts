import { prisma } from "@/lib/prisma";
import { apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireBarber } from "@/lib/auth/requireBarber";

export async function GET() {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const barberExtra = await prisma.barber.findUnique({
      where: { id: auth.barberId },
      select: { avatarUrl: true },
    });

    const barber = {
      id: auth.barberId,
      name: auth.barberName,
      avatarUrl: barberExtra?.avatarUrl ?? null,
    };
    return apiSuccess(barber);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar perfil");
  }
}
