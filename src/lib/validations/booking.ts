import { z } from "zod";

// ============================================
// Appointment Schemas
// ============================================

export const createAppointmentSchema = z.object({
  serviceId: z.string().uuid("ID do serviço inválido"),
  barberId: z.string().uuid("ID do barbeiro inválido"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// Schema for guest appointments (no login required)
export const createGuestAppointmentSchema = z.object({
  serviceId: z.string().uuid("ID do serviço inválido"),
  barberId: z.string().uuid("ID do barbeiro inválido"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
  clientName: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  clientPhone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
});

export type CreateGuestAppointmentInput = z.infer<
  typeof createGuestAppointmentSchema
>;

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  reason: z
    .string()
    .min(1, "Motivo é obrigatório")
    .max(500, "Motivo deve ter no máximo 500 caracteres")
    .optional(),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const cancelAppointmentByBarberSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  reason: z
    .string()
    .min(1, "Motivo é obrigatório")
    .max(500, "Motivo deve ter no máximo 500 caracteres"),
});

export type CancelAppointmentByBarberInput = z.infer<
  typeof cancelAppointmentByBarberSchema
>;

// Schema for barber creating appointment for a client
export const createAppointmentByBarberSchema = z.object({
  serviceId: z.string().uuid("ID do serviço inválido"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
  clientName: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  clientPhone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
});

export type CreateAppointmentByBarberInput = z.infer<
  typeof createAppointmentByBarberSchema
>;

// ============================================
// Working Hours Schemas
// ============================================

const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM");

export const workingHoursSchema = z
  .object({
    barberId: z.string().uuid("ID do barbeiro inválido"),
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6, "Dia da semana deve ser entre 0 (domingo) e 6 (sábado)"),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    breakStart: timeStringSchema.nullable().optional(),
    breakEnd: timeStringSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      const start = data.startTime.split(":").map(Number);
      const end = data.endTime.split(":").map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return endMinutes > startMinutes;
    },
    { message: "Horário de término deve ser após o horário de início" },
  );

export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;

// ============================================
// Barber Absence Schemas
// ============================================

export const barberAbsenceSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
    startTime: timeStringSchema.nullable().optional(),
    endTime: timeStringSchema.nullable().optional(),
    reason: z
      .string()
      .max(500, "Motivo deve ter no máximo 500 caracteres")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Allow full-day absence (no times)
      if (!data.startTime && !data.endTime) return true;
      // If one is present, both must be present
      if (!data.startTime || !data.endTime) return false;
      const start = data.startTime.split(":").map(Number);
      const end = data.endTime.split(":").map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return endMinutes > startMinutes;
    },
    {
      message:
        "Para ausência parcial, informe início e fim (fim deve ser após o início).",
    },
  );

export type BarberAbsenceInput = z.infer<typeof barberAbsenceSchema>;

// ============================================
// Shop Hours / Closures Schemas
// ============================================

export const shopHoursDaySchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6, "Dia da semana deve ser entre 0 (domingo) e 6 (sábado)"),
    isOpen: z.boolean(),
    startTime: timeStringSchema.nullable().optional(),
    endTime: timeStringSchema.nullable().optional(),
    breakStart: timeStringSchema.nullable().optional(),
    breakEnd: timeStringSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.isOpen) return true;
      if (!data.startTime || !data.endTime) return false;
      const start = data.startTime.split(":").map(Number);
      const end = data.endTime.split(":").map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return endMinutes > startMinutes;
    },
    {
      message:
        "Quando aberto, informe início e fim (fim deve ser após o início).",
    },
  );

export const updateShopHoursSchema = z.object({
  days: z.array(shopHoursDaySchema).min(1).max(7),
});

export type UpdateShopHoursInput = z.infer<typeof updateShopHoursSchema>;

export const shopClosureSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
    startTime: timeStringSchema.nullable().optional(),
    endTime: timeStringSchema.nullable().optional(),
    reason: z
      .string()
      .max(500, "Motivo deve ter no máximo 500 caracteres")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.startTime && !data.endTime) return true;
      if (!data.startTime || !data.endTime) return false;
      const start = data.startTime.split(":").map(Number);
      const end = data.endTime.split(":").map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return endMinutes > startMinutes;
    },
    {
      message:
        "Para fechamento parcial, informe início e fim (fim deve ser após o início).",
    },
  );

export type ShopClosureInput = z.infer<typeof shopClosureSchema>;

// ============================================
// Query Schemas
// ============================================

export const getSlotsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  barberId: z.string().uuid("ID do barbeiro inválido"),
  serviceId: z.string().uuid("ID do serviço inválido"),
});

export type GetSlotsQuery = z.infer<typeof getSlotsQuerySchema>;

export const getAppointmentsQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional(),
  barberId: z.string().uuid("ID do barbeiro inválido").optional(),
});

export type GetAppointmentsQuery = z.infer<typeof getAppointmentsQuerySchema>;

// ============================================
// Guest Appointment Schemas
// ============================================

export const guestLookupSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
});

export type GuestLookupInput = z.infer<typeof guestLookupSchema>;

export const cancelGuestAppointmentSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  phone: z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
});

export type CancelGuestAppointmentInput = z.infer<
  typeof cancelGuestAppointmentSchema
>;

// ============================================
// Service Schemas
// ============================================

export const createServiceSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(100, "Slug deve ter no máximo 100 caracteres")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug deve conter apenas letras minúsculas, números e hífens",
    ),
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .nullable()
    .optional(),
  duration: z
    .number()
    .int()
    .min(15, "Duração mínima é 15 minutos")
    .max(240, "Duração máxima é 240 minutos"),
  price: z
    .number()
    .min(0, "Preço não pode ser negativo")
    .max(10000, "Preço máximo é R$ 10.000"),
  active: z.boolean().default(true),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
