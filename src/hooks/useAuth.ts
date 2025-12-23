"use client";

import { authService } from "@/services/auth";
import type { LoginInput, SignupInput } from "@/lib/validations/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => authService.getUser(),
    retry: false,
  });
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authService.getSession(),
    retry: false,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) =>
      authService.signIn(data.email, data.password),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.error.message || "Credenciais inválidas");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Login realizado com sucesso!");
      router.push("/dashboard");
      router.refresh();
    },
    onError: () => {
      toast.error("Erro ao fazer login");
    },
  });
}

export function useSignUp() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SignupInput) =>
      authService.signUp(data.email, data.password),
    onSuccess: (response, variables) => {
      if (response.error) {
        toast.error(response.error.message || "Erro ao criar conta");
        return;
      }
      toast.success("Conta criada! Verifique seu email.");
      router.push(`/verify-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: () => {
      toast.error("Erro ao criar conta");
    },
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: () => authService.signInWithGoogle(),
    onError: () => {
      toast.error("Erro ao fazer login com Google");
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      queryClient.clear();
      toast.success("Logout realizado");
      router.push("/");
      router.refresh();
    },
    onError: () => {
      toast.error("Erro ao fazer logout");
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
    onSuccess: () => {
      toast.success("Email de recuperação enviado!");
    },
    onError: () => {
      toast.error("Erro ao enviar email de recuperação");
    },
  });
}

export function useUpdatePassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: (password: string) => authService.updatePassword(password),
    onSuccess: () => {
      toast.success("Senha atualizada com sucesso!");
      router.push("/login");
    },
    onError: () => {
      toast.error("Erro ao atualizar senha");
    },
  });
}
