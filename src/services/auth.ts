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

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string,
    phone: string,
  ): Promise<AuthResponse> {
    const supabase = createClient();
    if (!supabase)
      return { user: null, session: null, error: NOT_CONFIGURED_ERROR };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });
    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const supabase = createClient();
    if (!supabase)
      return { user: null, session: null, error: NOT_CONFIGURED_ERROR };
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  async signInWithGoogle(): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

  async resetPassword(email: string): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/update`,
    });
    if (error) throw error;
  },

  async updatePassword(password: string): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
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
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw error;
  },
};
