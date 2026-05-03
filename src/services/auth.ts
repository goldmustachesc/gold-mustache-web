"use client";

import { createClient } from "@/lib/supabase/client";
import { AuthError } from "@supabase/supabase-js";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

class NotConfiguredError extends AuthError {
  constructor() {
    super("Supabase not configured", 0, "not_configured");
  }
}

const NOT_CONFIGURED_ERROR = new NotConfiguredError();

async function requestAuthRoute<T>(
  path: string,
  body: Record<string, string>,
): Promise<{ ok: true; data: T } | { ok: false; error: AuthError }> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | { data?: T }
    | { error?: string; message?: string; details?: unknown };

  if (response.ok && payload && "data" in payload && payload.data) {
    return { ok: true, data: payload.data };
  }

  const message =
    payload && "message" in payload && payload.message
      ? payload.message
      : "Erro na autenticação";
  const errorCode =
    payload && "error" in payload && payload.error ? payload.error : "auth";

  return {
    ok: false,
    error: new AuthError(message, response.status, errorCode),
  };
}

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string,
    phone: string,
  ): Promise<AuthResponse> {
    if (!createClient())
      return { user: null, session: null, error: NOT_CONFIGURED_ERROR };

    const result = await requestAuthRoute<{
      user: User | null;
      session: Session | null;
    }>("/api/auth/sign-up", { email, password, fullName, phone });

    if (!result.ok) {
      return { user: null, session: null, error: result.error };
    }

    return {
      user: result.data.user,
      session: result.data.session,
      error: null,
    };
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!createClient())
      return { user: null, session: null, error: NOT_CONFIGURED_ERROR };

    const result = await requestAuthRoute<{
      user: User | null;
      session: Session | null;
    }>("/api/auth/sign-in", { email, password });

    if (!result.ok) {
      return { user: null, session: null, error: result.error };
    }

    return {
      user: result.data.user,
      session: result.data.session,
      error: null,
    };
  },

  async signInWithGoogle(locale: string): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string, locale: string): Promise<void> {
    if (!createClient()) return;
    const result = await requestAuthRoute<{ success: true }>(
      "/api/auth/reset-password",
      { email, locale },
    );
    if (!result.ok) throw result.error;
  },

  async updatePassword(password: string): Promise<void> {
    if (!createClient()) return;
    const result = await requestAuthRoute<{ success: true }>(
      "/api/auth/update-password",
      { password },
    );
    if (!result.ok) throw result.error;
  },

  async getUser(): Promise<User | null> {
    const supabase = createClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  async getSession(): Promise<Session | null> {
    const supabase = createClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async resendConfirmationEmail(email: string): Promise<void> {
    if (!createClient()) return;
    const result = await requestAuthRoute<{ success: true }>(
      "/api/auth/resend-confirmation-email",
      { email },
    );
    if (!result.ok) throw result.error;
  },
};
