import { z } from "zod";
import {
  isAbsenceRecurrenceWithinSupportedHorizon,
  MAX_RECURRENCE_HORIZON_MONTHS,
} from "@/lib/barber-absence-recurrence";
import { parseDateStringToUTC } from "@/utils/time-slots";

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

export const barberAbsenceRecurrenceSchema = z
  .object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    interval: z
      .number()
      .int()
      .min(1, "Intervalo deve ser de pelo menos 1")
      .max(365, "Intervalo deve ser de no máximo 365"),
    endsAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
      .nullable()
      .optional(),
    occurrenceCount: z
      .number()
      .int()
      .min(1, "Quantidade deve ser de pelo menos 1")
      .max(365, "Quantidade deve ser de no máximo 365")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasEndsAt = typeof data.endsAt === "string";
    const hasOccurrenceCount = typeof data.occurrenceCount === "number";

    if (hasEndsAt === hasOccurrenceCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Informe apenas data final ou quantidade de ocorrências.",
      });
    }
  });

export type BarberAbsenceRecurrenceInput = z.infer<
  typeof barberAbsenceRecurrenceSchema
>;

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

// Schema for updating barber working hours (bulk update for all days)
export const barberWorkingHoursDaySchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6, "Dia da semana deve ser entre 0 (domingo) e 6 (sábado)"),
    isWorking: z.boolean(),
    startTime: timeStringSchema.nullable().optional(),
    endTime: timeStringSchema.nullable().optional(),
    breakStart: timeStringSchema.nullable().optional(),
    breakEnd: timeStringSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.isWorking) return true;
      if (!data.startTime || !data.endTime) return false;
      const start = data.startTime.split(":").map(Number);
      const end = data.endTime.split(":").map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return endMinutes > startMinutes;
    },
    {
      message:
        "Quando trabalhando, informe início e fim (fim deve ser após o início).",
    },
  );

export const updateBarberWorkingHoursSchema = z.object({
  days: z.array(barberWorkingHoursDaySchema).min(1).max(7),
});

export type UpdateBarberWorkingHoursInput = z.infer<
  typeof updateBarberWorkingHoursSchema
>;

export type BarberWorkingHoursDayInput = z.infer<
  typeof barberWorkingHoursDaySchema
>;

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
    autoCancelConflicts: z.boolean().optional().default(false),
    recurrence: barberAbsenceRecurrenceSchema.nullable().optional(),
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

export const barberAbsenceCreateSchema = barberAbsenceSchema.superRefine(
  (data, ctx) => {
    if (data.recurrence?.endsAt && data.recurrence.endsAt < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrence", "endsAt"],
        message: "A recorrência deve terminar em uma data igual ou posterior.",
      });
    }

    if (
      data.recurrence?.endsAt &&
      !isAbsenceRecurrenceWithinSupportedHorizon(
        data.date,
        data.recurrence.endsAt,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrence", "endsAt"],
        message: `A recorrência não pode ultrapassar ${MAX_RECURRENCE_HORIZON_MONTHS} meses.`,
      });
    }

    if (
      data.recurrence?.frequency === "DAILY" &&
      data.recurrence.endsAt &&
      data.recurrence.interval > 0
    ) {
      const startDate = parseDateStringToUTC(data.date);
      const endDate = parseDateStringToUTC(data.recurrence.endsAt);
      const inclusiveDays =
        Math.floor(
          (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
        ) + 1;

      if (inclusiveDays > 365) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recurrence", "endsAt"],
          message:
            "A recorrência diária com data final não pode ultrapassar 365 ocorrências.",
        });
      }
    }
  },
);

export type BarberAbsenceInput = z.infer<typeof barberAbsenceSchema>;
export type BarberAbsenceCreateInput = z.infer<
  typeof barberAbsenceCreateSchema
>;

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

const dateRangeFields = {
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional(),
};

const validateDateRange = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) => !startDate || !endDate || startDate <= endDate;

const dateRangeRefineOptions = {
  message: "endDate deve ser igual ou posterior a startDate",
  path: ["endDate"],
};

export const dateRangeQuerySchema = z
  .object(dateRangeFields)
  .refine(validateDateRange, dateRangeRefineOptions);

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

export const getAppointmentsQuerySchema = z
  .object({
    ...dateRangeFields,
    barberId: z.string().uuid("ID do barbeiro inválido").optional(),
  })
  .refine(validateDateRange, dateRangeRefineOptions);

export type GetAppointmentsQuery = z.infer<typeof getAppointmentsQuerySchema>;
