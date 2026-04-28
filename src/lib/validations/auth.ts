import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Nome é obrigatório")
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(100, "Nome deve ter no máximo 100 caracteres"),
    phone: z
      .string()
      .min(1, "Telefone é obrigatório")
      .refine(
        (val) => {
          const digits = val.replace(/\D/g, "");
          return digits.length >= 10 && digits.length <= 11;
        },
        { message: "Telefone deve ter 10 ou 11 dígitos" },
      ),
    email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Use pelo menos uma letra maiúscula")
      .regex(/\d/, "Use pelo menos um número"),
    confirmPassword: z.string().min(1, "Confirmação é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export const resetSchema = z.object({
  email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
});

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Use pelo menos uma letra maiúscula")
      .regex(/\d/, "Use pelo menos um número"),
    confirmPassword: z.string().min(1, "Confirmação é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
