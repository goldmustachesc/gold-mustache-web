import { z } from "zod";

export const feedbackSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Avaliação mínima é 1")
    .max(5, "Avaliação máxima é 5"),
  comment: z
    .string()
    .trim()
    .min(1, "Comentário não pode ser vazio")
    .max(1000, "Comentário deve ter no máximo 1000 caracteres")
    .optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
