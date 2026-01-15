"use client";

import { Button } from "@/components/ui/button";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 dark:from-zinc-950 dark:via-zinc-900 dark:to-black relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent dark:from-primary/10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary/10 to-transparent blur-3xl dark:from-primary/5 pointer-events-none" />

      {/* Home button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"
        >
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-4">
            <div className="h-14 w-14 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-2 shadow-lg">
              <Image
                src="/logo.png"
                alt="Gold Mustache Logo"
                width={40}
                height={40}
                className="rounded-xl object-cover"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Entrar no Gold Mustache
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Não tem conta?{" "}
                <Link
                  href={`/${locale}/signup`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  Criar conta
                </Link>
              </p>
            </div>
          </div>

          {/* Social login */}
          <div className="space-y-3">
            <GoogleButton text="Entrar com Google" />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-300 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-50 px-4 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
                ou
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="alan.turing@example.com"
                className="w-full rounded-lg border border-zinc-300 bg-zinc-100/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Senha
                </label>
                <Link
                  href={`/${locale}/reset-password`}
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100/50 px-4 py-3 pr-12 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className={`w-full py-3 text-sm font-medium transition-all duration-200 ${
                isFormFilled
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                  : "bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500"
              }`}
              disabled={isPending || !isFormFilled}
            >
              {isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Terms */}
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
            Ao entrar, você concorda com nossos{" "}
            <Link
              href={`/${locale}/politica-de-privacidade`}
              className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Termos
            </Link>{" "}
            e{" "}
            <Link
              href={`/${locale}/politica-de-privacidade`}
              className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
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
