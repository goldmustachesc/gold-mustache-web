"use client";

import { Button } from "@/components/ui/button";
import { useUpdatePassword } from "@/hooks/useAuth";
import {
  newPasswordSchema,
  type NewPasswordInput,
} from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthCard } from "./AuthCard";
import { FormField } from "./FormField";

export function NewPasswordForm() {
  const { mutate: updatePassword, isPending } = useUpdatePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
  });

  const onSubmit = (data: NewPasswordInput) => {
    updatePassword(data.password);
  };

  return (
    <AuthCard title="Nova senha" description="Digite sua nova senha">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          id="password"
          label="Nova senha"
          type="password"
          placeholder="Mínimo 8 caracteres"
          error={errors.password}
          {...register("password")}
        />

        <FormField
          id="confirmPassword"
          label="Confirmar senha"
          type="password"
          placeholder="Repita a senha"
          error={errors.confirmPassword}
          {...register("confirmPassword")}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthCard>
  );
}
