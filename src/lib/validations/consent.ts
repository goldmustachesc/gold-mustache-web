import { z } from "zod";

/**
 * Schema for saving cookie consent preferences.
 */
export const saveConsentSchema = z.object({
  analyticsConsent: z.boolean(),
  marketingConsent: z.boolean(),
  anonymousId: z.string().uuid("ID anônimo inválido").optional().nullable(),
});

export type SaveConsentInput = z.infer<typeof saveConsentSchema>;

/**
 * Schema for querying consent by anonymous ID.
 */
export const getConsentQuerySchema = z.object({
  anonymousId: z.string().uuid("ID anônimo inválido").optional(),
});

export type GetConsentQuery = z.infer<typeof getConsentQuerySchema>;
