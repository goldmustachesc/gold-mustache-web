"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useSignUp } from "@/hooks/useAuth";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { AuthCard } from "./AuthCard";
import { FormField } from "./FormField";
import { GoogleButton } from "./GoogleButton";

interface SignupFormProps {
  locale: string;
}

// Format phone number as (XX) XXXXX-XXXX
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function SignupForm({ locale }: SignupFormProps) {
  const { mutate: signUp, isPending } = useSignUp();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      setValue("phone", formatted, { shouldValidate: true });
    },
    [setValue],
  );

  const onSubmit = (data: SignupInput) => {
    signUp(data);
  };

  return (
    <AuthCard title="Criar conta" description="Preencha os dados abaixo">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          id="fullName"
          label="Nome completo"
          type="text"
          placeholder="Seu nome completo"
          autoComplete="name"
          error={errors.fullName}
          {...register("fullName")}
        />

        <FormField
          id="phone"
          label="Telefone (WhatsApp)"
          type="tel"
          placeholder="(11) 99999-9999"
          autoComplete="tel"
          error={errors.phone}
          {...register("phone", { onChange: handlePhoneChange })}
        />

        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          error={errors.email}
          {...register("email")}
        />

        <FormField
          id="password"
          label="Senha"
          type="password"
          placeholder="Mínimo 6 caracteres"
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
          {isPending ? "Criando..." : "Criar conta"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <GoogleButton text="Cadastrar com Google" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href={`/${locale}/login`}
          className="text-primary hover:underline"
        >
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
