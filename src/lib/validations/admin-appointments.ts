import { z } from "zod";

export const listAdminAppointmentsQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)")
    .optional(),
  barberId: z.string().uuid("barberId deve ser um UUID válido").optional(),
  status: z
    .enum([
      "CONFIRMED",
      "CANCELLED_BY_CLIENT",
      "CANCELLED_BY_BARBER",
      "COMPLETED",
      "NO_SHOW",
    ])
    .optional(),
  q: z.string().max(100).optional(),
  orderBy: z.enum(["date", "startTime", "createdAt", "status"]).default("date"),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListAdminAppointmentsQuery = z.infer<
  typeof listAdminAppointmentsQuerySchema
>;

export const adminCreateAppointmentSchema = z
  .object({
    barberId: z.string().uuid("barberId deve ser um UUID válido"),
    serviceId: z.string().uuid("serviceId deve ser um UUID válido"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)"),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)"),
    clientProfileId: z
      .string()
      .uuid("clientProfileId deve ser um UUID válido")
      .optional(),
    guest: z
      .object({
        name: z.string().min(2).max(100),
        phone: z.string().min(8).max(20),
      })
      .optional(),
  })
  .refine((d) => Boolean(d.clientProfileId) !== Boolean(d.guest), {
    message: "Forneça clientProfileId XOR guest, não ambos nem nenhum",
  });

export type AdminCreateAppointmentInput = z.infer<
  typeof adminCreateAppointmentSchema
>;

export const adminCancelAppointmentSchema = z.object({
  reason: z.string().min(3).max(300),
});

export type AdminCancelAppointmentInput = z.infer<
  typeof adminCancelAppointmentSchema
>;

export const adminRescheduleAppointmentSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)"),
});

export type AdminRescheduleAppointmentInput = z.infer<
  typeof adminRescheduleAppointmentSchema
>;

export const calendarQuerySchema = z.object({
  view: z.enum(["day", "week"]).default("day"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (YYYY-MM-DD)"),
  barberIds: z.string().optional(),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
