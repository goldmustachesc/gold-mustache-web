import { requireAdmin } from "@/lib/auth/requireAdmin";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { calendarQuerySchema } from "@/lib/validations/admin-appointments";
import { getCalendarForAdmin } from "@/services/admin/appointments";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const parsed = calendarQuerySchema.safeParse(
    Object.fromEntries(searchParams),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Parâmetros inválidos",
      400,
      parsed.error.flatten(),
    );
  }

  const barberIds = parsed.data.barberIds?.split(",").filter(Boolean);

  try {
    const result = await getCalendarForAdmin({
      view: parsed.data.view,
      date: parsed.data.date,
      barberIds,
    });
    return apiSuccess(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar calendário");
  }
}
