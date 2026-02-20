"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignIn } from "@/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { GoogleButton } from "./GoogleButton";

interface LoginFormProps {
  locale: string;
}

export function LoginForm({ locale }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: signIn, isPending } = useSignIn();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch("email");
  const passwordValue = watch("password");
  const isFormFilled = emailValue?.length > 0 && passwordValue?.length > 0;

  const onSubmit = (data: LoginInput) => {
    signIn(data);
  };

  const inputClassName =
    "w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
  const labelClassName = "text-sm font-medium text-foreground";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background to-muted/70 dark:to-card/70" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/15" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5" />

      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="rounded-full border border-border/80 bg-background/90 px-3 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground"
        >
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </Button>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] rounded-xl border border-border/80 bg-card/95 p-6 shadow-lg backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border/80 bg-background p-2 shadow-sm">
              <Image
                src="/logo.png"
                alt="Gold Mustache Logo"
                width={40}
                height={40}
                className="rounded-xl object-cover"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Tradição e estilo masculino
              </p>
              <h1 className="font-playfair text-3xl font-bold tracking-tight text-foreground">
                Entrar no Gold Mustache
              </h1>
              <p className="text-sm text-muted-foreground">
                Não tem conta?{" "}
                <Link
                  href={`/${locale}/signup`}
                  className="font-semibold text-foreground transition-colors hover:text-primary"
                >
                  Criar conta
                </Link>
              </p>
            </div>
          </div>

          <div className="mb-5">
            <GoogleButton
              text="Entrar com Google"
              className="bg-background hover:bg-muted"
            />
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-xs text-muted-foreground">
                ou
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className={labelClassName}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="alan.turing@example.com"
                autoComplete="email"
                className={inputClassName}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={labelClassName}>
                  Senha
                </label>
                <Link
                  href={`/${locale}/reset-password`}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className={cn(inputClassName, "pr-12")}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className={cn(
                "h-11 w-full text-sm font-semibold transition-all",
                !isFormFilled &&
                  "bg-muted text-muted-foreground shadow-none hover:bg-muted",
              )}
              disabled={isPending || !isFormFilled}
            >
              {isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Ao entrar, você concorda com nossos{" "}
            <Link
              href={`/${locale}/politica-de-privacidade`}
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Termos
            </Link>{" "}
            e{" "}
            <Link
              href={`/${locale}/politica-de-privacidade`}
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
