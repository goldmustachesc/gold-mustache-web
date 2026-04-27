import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockExchangeCodeForSession = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

import { GET } from "../route";
import { getSafeCallbackRedirectOrigin, isOAuthProviderUser } from "../utils";

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://staging.goldmustachebarbearia.com.br",
    );
    vi.stubEnv("VERCEL_URL", "gold-mustache-barbearia-staging.vercel.app");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats OAuth users as verified even when providers metadata is missing", () => {
    expect(
      isOAuthProviderUser({
        provider: "google",
      }),
    ).toBe(true);
  });

  it("ignores untrusted forwarded hosts during callback redirects", () => {
    const request = new Request(
      "https://gold-mustache-barbearia-staging.vercel.app/auth/callback?code=test",
      {
        headers: {
          "x-forwarded-host": "evil.example.com",
        },
      },
    );

    expect(getSafeCallbackRedirectOrigin(request)).toBe(
      "https://staging.goldmustachebarbearia.com.br",
    );
  });

  it("redirects to the trusted forwarded host and verifies OAuth users", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          app_metadata: {
            provider: "google",
          },
        },
      },
      error: null,
    });
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const response = await GET(
      new Request(
        "https://gold-mustache-barbearia-staging.vercel.app/auth/callback?code=test&type=recovery&next=%2Fprofile",
        {
          headers: {
            "x-forwarded-host": "staging.goldmustachebarbearia.com.br",
          },
        },
      ),
    );

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      data: { emailVerified: true },
    });
    expect(response.headers.get("location")).toBe(
      "https://staging.goldmustachebarbearia.com.br/profile",
    );

    infoSpy.mockRestore();
  });

  it("falls back to login with error when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid code"),
    });

    const response = await GET(
      new Request("https://staging.goldmustachebarbearia.com.br/auth/callback"),
    );

    expect(response.headers.get("location")).toBe(
      "https://staging.goldmustachebarbearia.com.br/login?error=auth_callback_error",
    );
  });
});
