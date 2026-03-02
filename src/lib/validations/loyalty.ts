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

export const redeemRewardSchema = z.object({
  rewardId: z.string().uuid("ID da recompensa inválido"),
});

export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;

export const redemptionCodeSchema = z
  .string()
  .length(6, "Código deve ter 6 caracteres")
  .regex(/^[A-Z0-9]+$/, "Código deve ser alfanumérico uppercase");

export type RedemptionCodeInput = z.infer<typeof redemptionCodeSchema>;
