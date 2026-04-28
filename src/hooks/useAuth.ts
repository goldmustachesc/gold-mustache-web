"use client";

import { authService } from "@/services/auth";
import type { LoginInput, SignupInput } from "@/lib/validations/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  translateAuthError,
  isEmailNotConfirmedError,
  createAuthErrorTranslations,
} from "@/utils/auth-errors";
import { getSafeRedirectPath } from "@/utils/redirect";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => authService.getUser(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authService.getSession(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const errorTranslations = createAuthErrorTranslations(t);
  const redirectPath = getSafeRedirectPath(
    searchParams.get("redirect"),
    `/${locale}/dashboard`,
  );

  return useMutation({
    mutationFn: (data: LoginInput) =>
      authService.signIn(data.email, data.password),
    onSuccess: (response) => {
      if (response.error) {
        const errorMessage = response.error.message || "";

        if (isEmailNotConfirmedError(errorMessage)) {
          if (response.session) {
            queryClient.invalidateQueries({ queryKey: ["user"] });
            queryClient.invalidateQueries({ queryKey: ["session"] });
            toast.success(t("toast.loginSuccess"));
            router.push(redirectPath);
            router.refresh();
            return;
          }
          toast.error(translateAuthError(errorMessage, errorTranslations));
          return;
        }

        toast.error(translateAuthError(errorMessage, errorTranslations));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success(t("toast.loginSuccess"));
      router.push(redirectPath);
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
  const errorTranslations = createAuthErrorTranslations(t);

  return useMutation({
    mutationFn: (data: SignupInput) =>
      authService.signUp(data.email, data.password, data.fullName, data.phone),
    onSuccess: (response) => {
      if (response.error) {
        const errorMessage = response.error.message || "";
        toast.error(translateAuthError(errorMessage, errorTranslations));
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
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: () => authService.signInWithGoogle(locale),
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
      queryClient.setQueryData(["user"], null);
      queryClient.setQueryData(["session"], null);
      toast.success(t("toast.logoutSuccess"));
      router.replace(`/${locale}`);
      router.refresh();
    },
    onError: () => {
      toast.error(t("toast.logoutError"));
    },
  });
}

export function useResetPassword() {
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (email: string) => authService.resetPassword(email, locale),
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
