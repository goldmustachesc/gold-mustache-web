import { z } from "zod";

export const accountIdSchema = z.string().uuid("ID da conta inválido");

export const loyaltyAdjustSchema = z.object({
  points: z
    .number()
    .int("Pontos devem ser um número inteiro")
    .min(-10000, "Ajuste mínimo é -10.000 pontos")
    .max(10000, "Ajuste máximo é 10.000 pontos")
    .refine((v) => v !== 0, "Ajuste de zero pontos não é permitido"),
  reason: z
    .string()
    .min(1, "Motivo é obrigatório")
    .max(500, "Motivo deve ter no máximo 500 caracteres"),
});

export type LoyaltyAdjustInput = z.infer<typeof loyaltyAdjustSchema>;
