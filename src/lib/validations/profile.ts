import { z } from "zod";

/**
 * Brazilian states (UF) for validation
 */
const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

/**
 * Profile update validation schema
 * All fields are optional since users can update partial data
 */
export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  phone: z
    .string()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional(),
  street: z
    .string()
    .max(200, "Rua deve ter no máximo 200 caracteres")
    .optional(),
  number: z
    .string()
    .max(20, "Número deve ter no máximo 20 caracteres")
    .optional(),
  complement: z
    .string()
    .max(100, "Complemento deve ter no máximo 100 caracteres")
    .optional(),
  neighborhood: z
    .string()
    .max(100, "Bairro deve ter no máximo 100 caracteres")
    .optional(),
  city: z
    .string()
    .max(100, "Cidade deve ter no máximo 100 caracteres")
    .optional(),
  state: z
    .string()
    .toUpperCase()
    .refine(
      (val) =>
        val === "" ||
        BRAZILIAN_STATES.includes(val as (typeof BRAZILIAN_STATES)[number]),
      "Estado inválido. Use a sigla (ex: SP, RJ)",
    )
    .optional(),
  zipCode: z
    .string()
    .max(10, "CEP deve ter no máximo 10 caracteres")
    .regex(/^(\d{5}-?\d{3})?$/, "CEP inválido. Use o formato 00000-000")
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
