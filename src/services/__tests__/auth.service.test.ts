import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AuthError } from "@supabase/supabase-js";
import * as supabaseClient from "@/lib/supabase/client";

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/supabase/client", () => {
  return {
    createClient: () => ({
      auth: {},
    }),
  };
});

import { authService } from "../auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("services/auth", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3001" },
      writable: true,
    });
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("signUp posts payload and maps user/session", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: { user: { id: "u-1" }, session: { access_token: "t" } },
      }),
    );

    const result = await authService.signUp(
      "a@b.com",
      "pw",
      "João Silva",
      "11999999999",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-up",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          email: "a@b.com",
          password: "pw",
          fullName: "João Silva",
          phone: "11999999999",
        }),
      }),
    );
    expect(result.user).toEqual({ id: "u-1" });
    expect(result.session).toEqual({ access_token: "t" });
  });

  it("signUp handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    const result = await authService.signUp("a", "b", "c", "d");
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe("Supabase not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signIn posts payload and maps user/session", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: { user: { id: "u-1" }, session: { access_token: "t" } },
      }),
    );

    const result = await authService.signIn("a@b.com", "pw");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-in",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "a@b.com", password: "pw" }),
      }),
    );
    expect(result.user).toEqual({ id: "u-1" });
    expect(result.session).toEqual({ access_token: "t" });
    expect(result.error).toBeNull();
  });

  it("signIn handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    const result = await authService.signIn("a", "b");
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe("Supabase not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signInWithGoogle uses redirectTo based on window.location.origin and throws on error", async () => {
    const auth = {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.spyOn(supabaseClient, "createClient").mockReturnValue({ auth } as never);

    await expect(
      authService.signInWithGoogle("pt-BR"),
    ).resolves.toBeUndefined();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3001/pt-BR/auth/callback",
      },
    });

    auth.signInWithOAuth.mockResolvedValue({
      error: { message: "oauth" } as unknown as AuthError,
    });
    await expect(authService.signInWithGoogle("pt-BR")).rejects.toThrow(
      "oauth",
    );
  });

  it("signInWithGoogle handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(
      authService.signInWithGoogle("pt-BR"),
    ).resolves.toBeUndefined();
  });

  it("signOut throws when supabase returns error", async () => {
    const auth = {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.spyOn(supabaseClient, "createClient").mockReturnValue({ auth } as never);

    await expect(authService.signOut()).resolves.toBeUndefined();

    auth.signOut.mockResolvedValue({
      error: { message: "x" } as unknown as AuthError,
    });
    await expect(authService.signOut()).rejects.toThrow("x");
  });

  it("signOut handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.signOut()).resolves.toBeUndefined();
  });

  it("resetPassword posts payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { success: true } }));

    await expect(
      authService.resetPassword("a@b.com", "pt-BR"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.com", locale: "pt-BR" }),
      }),
    );
  });

  it("resetPassword handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(
      authService.resetPassword("a@b.com", "pt-BR"),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updatePassword posts payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { success: true } }));

    await expect(authService.updatePassword("pw")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/update-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "pw" }),
      }),
    );
  });

  it("updatePassword handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.updatePassword("pw")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getUser returns data.user", async () => {
    const auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u-1" } } }),
    };
    vi.spyOn(supabaseClient, "createClient").mockReturnValue({ auth } as never);
    await expect(authService.getUser()).resolves.toEqual({ id: "u-1" });
  });

  it("getUser handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.getUser()).resolves.toBeNull();
  });

  it("getSession returns data.session", async () => {
    const auth = {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: "t" } } }),
    };
    vi.spyOn(supabaseClient, "createClient").mockReturnValue({ auth } as never);
    await expect(authService.getSession()).resolves.toEqual({
      access_token: "t",
    });
  });

  it("getSession handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(authService.getSession()).resolves.toBeNull();
  });

  it("resendConfirmationEmail posts payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { success: true } }));

    await expect(
      authService.resendConfirmationEmail("a@b.com"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/resend-confirmation-email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.com" }),
      }),
    );
  });

  it("resendConfirmationEmail handles null supabase client", async () => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue(null as never);
    await expect(
      authService.resendConfirmationEmail("a@b.com"),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
