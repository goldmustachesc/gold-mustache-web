import { z } from "zod";

// ============================================
// Service Constraints
// ============================================

/**
 * Service validation constraints
 */
export const SERVICE_CONSTRAINTS = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  DURATION_MIN_MINUTES: 15,
  DURATION_MAX_MINUTES: 180,
  DURATION_STEP_MINUTES: 15,
  PRICE_MIN: 0.01,
  PRICE_MAX: 10000,
} as const;

// ============================================
// Admin Service Schemas
// ============================================

/**
 * Helper function to generate slug from name
 * - Converts to lowercase
 * - Removes accents
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Falls back to 'servico' if result is empty
 */
export function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  // Fallback to 'servico' if slug is empty (e.g., name was only special characters)
  return slug || "servico";
}

/**
 * Schema for creating a new service (admin)
 * Duration must be a multiple of 15 minutes (aligned with booking slots)
 */
export const createAdminServiceSchema = z.object({
  name: z
    .string()
    .min(
      SERVICE_CONSTRAINTS.NAME_MIN_LENGTH,
      `Nome deve ter pelo menos ${SERVICE_CONSTRAINTS.NAME_MIN_LENGTH} caracteres`,
    )
    .max(
      SERVICE_CONSTRAINTS.NAME_MAX_LENGTH,
      `Nome deve ter no máximo ${SERVICE_CONSTRAINTS.NAME_MAX_LENGTH} caracteres`,
    ),
  description: z
    .string()
    .max(
      SERVICE_CONSTRAINTS.DESCRIPTION_MAX_LENGTH,
      `Descrição deve ter no máximo ${SERVICE_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} caracteres`,
    )
    .nullable()
    .optional(),
  duration: z
    .number()
    .int("Duração deve ser um número inteiro")
    .min(
      SERVICE_CONSTRAINTS.DURATION_MIN_MINUTES,
      `Duração mínima é ${SERVICE_CONSTRAINTS.DURATION_MIN_MINUTES} minutos`,
    )
    .max(
      SERVICE_CONSTRAINTS.DURATION_MAX_MINUTES,
      `Duração máxima é ${SERVICE_CONSTRAINTS.DURATION_MAX_MINUTES} minutos`,
    )
    .refine(
      (val) => val % SERVICE_CONSTRAINTS.DURATION_STEP_MINUTES === 0,
      `Duração deve ser múltiplo de ${SERVICE_CONSTRAINTS.DURATION_STEP_MINUTES} minutos (ex: 15, 30, 45, 60...)`,
    ),
  price: z
    .number()
    .min(SERVICE_CONSTRAINTS.PRICE_MIN, "Preço deve ser maior que zero")
    .max(
      SERVICE_CONSTRAINTS.PRICE_MAX,
      `Preço máximo é R$ ${SERVICE_CONSTRAINTS.PRICE_MAX.toLocaleString("pt-BR")},00`,
    ),
});

export type CreateAdminServiceInput = z.infer<typeof createAdminServiceSchema>;

/**
 * Schema for updating an existing service (admin)
 * All fields are optional, but at least one must be provided
 */
export const updateAdminServiceSchema = z
  .object({
    name: z
      .string()
      .min(
        SERVICE_CONSTRAINTS.NAME_MIN_LENGTH,
        `Nome deve ter pelo menos ${SERVICE_CONSTRAINTS.NAME_MIN_LENGTH} caracteres`,
      )
      .max(
        SERVICE_CONSTRAINTS.NAME_MAX_LENGTH,
        `Nome deve ter no máximo ${SERVICE_CONSTRAINTS.NAME_MAX_LENGTH} caracteres`,
      )
      .optional(),
    description: z
      .string()
      .max(
        SERVICE_CONSTRAINTS.DESCRIPTION_MAX_LENGTH,
        `Descrição deve ter no máximo ${SERVICE_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} caracteres`,
      )
      .nullable()
      .optional(),
    duration: z
      .number()
      .int("Duração deve ser um número inteiro")
      .min(
        SERVICE_CONSTRAINTS.DURATION_MIN_MINUTES,
        `Duração mínima é ${SERVICE_CONSTRAINTS.DURATION_MIN_MINUTES} minutos`,
      )
      .max(
        SERVICE_CONSTRAINTS.DURATION_MAX_MINUTES,
        `Duração máxima é ${SERVICE_CONSTRAINTS.DURATION_MAX_MINUTES} minutos`,
      )
      .refine(
        (val) => val % SERVICE_CONSTRAINTS.DURATION_STEP_MINUTES === 0,
        `Duração deve ser múltiplo de ${SERVICE_CONSTRAINTS.DURATION_STEP_MINUTES} minutos (ex: 15, 30, 45, 60...)`,
      )
      .optional(),
    price: z
      .number()
      .min(SERVICE_CONSTRAINTS.PRICE_MIN, "Preço deve ser maior que zero")
      .max(
        SERVICE_CONSTRAINTS.PRICE_MAX,
        `Preço máximo é R$ ${SERVICE_CONSTRAINTS.PRICE_MAX.toLocaleString("pt-BR")},00`,
      )
      .optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.duration !== undefined ||
      data.price !== undefined ||
      data.active !== undefined,
    { message: "Pelo menos um campo deve ser fornecido para atualização" },
  );

export type UpdateAdminServiceInput = z.infer<typeof updateAdminServiceSchema>;

/**
 * Schema for toggling service active status
 */
export const toggleServiceStatusSchema = z.object({
  active: z.boolean(),
});

export type ToggleServiceStatusInput = z.infer<
  typeof toggleServiceStatusSchema
>;
