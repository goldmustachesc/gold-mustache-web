"use client";

import { authService } from "@/services/auth";
import type { LoginInput, SignupInput } from "@/lib/validations/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  translateAuthError,
  isEmailNotConfirmedError,
  createAuthErrorTranslations,
} from "@/utils/auth-errors";

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
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (data: LoginInput) =>
      authService.signIn(data.email, data.password),
    onSuccess: (response) => {
      if (response.error) {
        const errorMessage = response.error.message || "";

        // If email not confirmed error, ignore it completely
        // The user should still be able to proceed - if Supabase blocks,
        // they need to disable email confirmation in Supabase Dashboard:
        // Authentication > Providers > Email > Disable "Confirm email"
        if (isEmailNotConfirmedError(errorMessage)) {
          // If we have a session, proceed normally
          if (response.session) {
            queryClient.invalidateQueries({ queryKey: ["user"] });
            queryClient.invalidateQueries({ queryKey: ["session"] });
            toast.success(t("toast.loginSuccess"));
            router.push(`/${locale}/dashboard`);
            router.refresh();
            return;
          }
          // If no session, silently ignore - don't show error
          // User needs to configure Supabase to disable email confirmation
          return;
        }

        toast.error(
          translateAuthError(errorMessage, createAuthErrorTranslations(t)),
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success(t("toast.loginSuccess"));
      router.push(`/${locale}/dashboard`);
      router.refresh();
    },
    onError: () => {
      toast.error(t("toast.loginError"));
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (data: SignupInput) =>
      authService.signUp(data.email, data.password, data.fullName, data.phone),
    onSuccess: (response) => {
      if (response.error) {
        const errorMessage = response.error.message || "";
        toast.error(
          translateAuthError(errorMessage, createAuthErrorTranslations(t)),
        );
        return;
      }
      // Atualiza os dados do usuário no cache
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success(t("toast.signupSuccess"));
      router.push(`/${locale}/dashboard`);
      router.refresh();
    },
    onError: () => {
      toast.error(t("toast.signupError"));
    },
  });
}

export function useSignInWithGoogle() {
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: () => authService.signInWithGoogle(),
    onError: () => {
      toast.error(t("toast.googleError"));
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      queryClient.clear();
      toast.success(t("toast.logoutSuccess"));
      router.push(`/${locale}`);
      router.refresh();
    },
    onError: () => {
      toast.error(t("toast.logoutError"));
    },
  });
}

export function useResetPassword() {
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
    onSuccess: () => {
      toast.success(t("toast.resetSuccess"));
    },
    onError: () => {
      toast.error(t("toast.resetError"));
    },
  });
}

export function useUpdatePassword() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (password: string) => authService.updatePassword(password),
    onSuccess: () => {
      toast.success(t("toast.updatePasswordSuccess"));
      router.push(`/${locale}/login`);
    },
    onError: () => {
      toast.error(t("toast.updatePasswordError"));
    },
  });
}
