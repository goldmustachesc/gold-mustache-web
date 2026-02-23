import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AuthError } from "@supabase/supabase-js";
import * as supabaseClient from "@/lib/supabase/client";

const supabaseAuthMock = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  resend: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => {
  return {
    createClient: () => ({
      auth: supabaseAuthMock,
    }),
  };
});

import { authService } from "../auth";

describe("services/auth (Supabase-mocked unit tests)", () => {
  beforeEach(() => {
    // happy-dom provides window; ensure origin exists
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3001" },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("signUp maps data.user/session + error", async () => {
    supabaseAuthMock.signUp.mockResolvedValue({
      data: { user: { id: "u-1" }, session: { access_token: "t" } },
      error: null,
    });

    const result = await authService.signUp(
      "a@b.com",
      "pw",
      "João Silva",
      "11999999999",
    );
    expect(supabaseAuthMock.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw",
      options: {
        data: {
          full_name: "João Silva",
          phone: "11999999999",
        },
      },
    });
    expect(result.user).toEqual({ id: "u-1" });
    expect(result.session).toEqual({ access_token: "t" });
  });

  it("signUp handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    const result = await authService.signUp("a", "b", "c", "d");
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe("Supabase not configured");
  });

  it("signIn maps data.user/session + error", async () => {
    supabaseAuthMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: "u-1" }, session: { access_token: "t" } },
      error: null,
    });

    const result = await authService.signIn("a@b.com", "pw");
    expect(supabaseAuthMock.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw",
    });
    expect(result.user).toEqual({ id: "u-1" });
    expect(result.session).toEqual({ access_token: "t" });
    expect(result.error).toBeNull();
  });

  it("signIn handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    const result = await authService.signIn("a", "b");
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe("Supabase not configured");
  });

  it("signInWithGoogle uses redirectTo based on window.location.origin and throws on error", async () => {
    supabaseAuthMock.signInWithOAuth.mockResolvedValue({ error: null });
    await expect(authService.signInWithGoogle()).resolves.toBeUndefined();
    expect(supabaseAuthMock.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3001/auth/callback",
      },
    });

    supabaseAuthMock.signInWithOAuth.mockResolvedValue({
      error: { message: "oauth" } as unknown as AuthError,
    });
    await expect(authService.signInWithGoogle()).rejects.toThrow("oauth");
  });

  it("signInWithGoogle handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.signInWithGoogle()).resolves.toBeUndefined();
  });

  it("signOut throws when supabase returns error", async () => {
    supabaseAuthMock.signOut.mockResolvedValue({ error: null });
    await expect(authService.signOut()).resolves.toBeUndefined();

    supabaseAuthMock.signOut.mockResolvedValue({
      error: { message: "x" } as unknown as AuthError,
    });
    await expect(authService.signOut()).rejects.toThrow("x");
  });

  it("signOut handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.signOut()).resolves.toBeUndefined();
  });

  it("resetPassword uses redirectTo based on window.location.origin", async () => {
    supabaseAuthMock.resetPasswordForEmail.mockResolvedValue({ error: null });
    await expect(authService.resetPassword("a@b.com")).resolves.toBeUndefined();
    expect(supabaseAuthMock.resetPasswordForEmail).toHaveBeenCalledWith(
      "a@b.com",
      { redirectTo: "http://localhost:3001/reset-password/update" },
    );
  });

  it("resetPassword handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.resetPassword("a@b.com")).resolves.toBeUndefined();
  });

  it("updatePassword throws when supabase returns error", async () => {
    supabaseAuthMock.updateUser.mockResolvedValue({ error: null });
    await expect(authService.updatePassword("pw")).resolves.toBeUndefined();

    supabaseAuthMock.updateUser.mockResolvedValue({
      error: { message: "x" } as unknown as AuthError,
    });
    await expect(authService.updatePassword("pw")).rejects.toThrow("x");
  });

  it("updatePassword handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.updatePassword("pw")).resolves.toBeUndefined();
  });

  it("getUser returns data.user", async () => {
    supabaseAuthMock.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    await expect(authService.getUser()).resolves.toEqual({ id: "u-1" });
  });

  it("getUser handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.getUser()).resolves.toBeNull();
  });

  it("getSession returns data.session", async () => {
    supabaseAuthMock.getSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
    });
    await expect(authService.getSession()).resolves.toEqual({
      access_token: "t",
    });
  });

  it("getSession handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.getSession()).resolves.toBeNull();
  });

  it("resendConfirmationEmail throws when supabase returns error", async () => {
    supabaseAuthMock.resend.mockResolvedValue({ error: null });
    await expect(
      authService.resendConfirmationEmail("a@b.com"),
    ).resolves.toBeUndefined();
    expect(supabaseAuthMock.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "a@b.com",
    });

    supabaseAuthMock.resend.mockResolvedValue({
      error: { message: "x" } as unknown as AuthError,
    });
    await expect(
      authService.resendConfirmationEmail("a@b.com"),
    ).rejects.toThrow("x");
  });

  it("resendConfirmationEmail handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(
      authService.resendConfirmationEmail("a@b.com"),
    ).resolves.toBeUndefined();
  });
});
