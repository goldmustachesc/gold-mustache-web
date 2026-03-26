import { describe, it, expect, beforeEach, vi } from "vitest";
import { verifyOrigin, requireValidOrigin } from "../verify-origin";

function makeRequest(headers: Record<string, string> = {}): Request {
  const headerMap = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
  } as unknown as Request;
}

describe("verifyOrigin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  function allowConsoleWarn() {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  }

  describe("URL normalization", () => {
    it("should accept origin when NEXT_PUBLIC_SITE_URL has trailing slash", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://staging.goldmustachebarbearia.com.br/",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should accept origin when NEXT_PUBLIC_SITE_URL has a path", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://staging.goldmustachebarbearia.com.br/pt-BR",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("www / non-www variants", () => {
    it("should accept www variant when NEXT_PUBLIC_SITE_URL has no www", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://staging.goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://www.staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should accept non-www variant when NEXT_PUBLIC_SITE_URL has www", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://www.staging.goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should accept exact match when NEXT_PUBLIC_SITE_URL has www", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://www.staging.goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://www.staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("Vercel URL", () => {
    it("should accept origin matching VERCEL_URL", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("VERCEL_URL", "gold-mustache-abc123.vercel.app");
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://gold-mustache-abc123.vercel.app",
        }),
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("ALLOWED_ORIGINS env var", () => {
    it("should accept origin from comma-separated ALLOWED_ORIGINS", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://gold-mustache-web.vercel.app",
      );
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://staging.goldmustachebarbearia.com.br,https://preview.goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://www.staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should accept non-www variant from ALLOWED_ORIGINS with www", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://www.staging.goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should normalize ALLOWED_ORIGINS entries with trailing slashes", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://staging.goldmustachebarbearia.com.br/",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should ignore empty entries in ALLOWED_ORIGINS", () => {
      allowConsoleWarn();
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("ALLOWED_ORIGINS", ",,");
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({ origin: "https://evil-site.com" }),
      );

      expect(result.valid).toBe(false);
    });
  });

  describe("development origins", () => {
    it("should accept localhost in development mode", () => {
      vi.stubEnv("NODE_ENV", "development");

      const result = verifyOrigin(
        makeRequest({ origin: "http://localhost:3001" }),
      );

      expect(result.valid).toBe(true);
    });

    it("should reject localhost in production mode", () => {
      allowConsoleWarn();
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({ origin: "http://localhost:3001" }),
      );

      expect(result.valid).toBe(false);
      expect(result.response).toBeDefined();
    });
  });

  describe("invalid origins", () => {
    it("should reject unknown origins with 403", async () => {
      allowConsoleWarn();
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({ origin: "https://evil-site.com" }),
      );

      expect(result.valid).toBe(false);
      expect(result.response).toBeDefined();
      const body = await result.response?.json();
      expect(body.error).toBe("FORBIDDEN");
      expect(result.response?.status).toBe(403);
    });
  });

  describe("Host header same-origin fallback", () => {
    it("should accept origin matching Host header even when not in allowed origins list", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://www.staging.goldmustachebarbearia.com.br",
          host: "www.staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should reject origin not matching Host header and not in allowed list", async () => {
      allowConsoleWarn();
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://evil-site.com",
          host: "www.staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(false);
      const body = await result.response?.json();
      expect(body.error).toBe("FORBIDDEN");
    });

    it("should accept origin matching Host with port", () => {
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "http://localhost:3001",
          host: "localhost:3001",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should use x-forwarded-host when host is absent", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://www.staging.goldmustachebarbearia.com.br",
          "x-forwarded-host": "www.staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should still reject when origin does not match host and not in list", async () => {
      allowConsoleWarn();
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          origin: "https://evil-site.com",
          host: "goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(false);
    });
  });

  describe("referer Host header fallback", () => {
    it("should accept referer matching Host header even when not in allowed origins", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          referer:
            "https://www.staging.goldmustachebarbearia.com.br/pt-BR/agendar",
          host: "www.staging.goldmustachebarbearia.com.br",
        }),
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("referer fallback", () => {
    it("should allow valid referer when origin is missing", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://staging.goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({
          referer: "https://staging.goldmustachebarbearia.com.br/pt-BR/agendar",
        }),
      );

      expect(result.valid).toBe(true);
    });

    it("should reject invalid referer when origin is missing", async () => {
      allowConsoleWarn();
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(
        makeRequest({ referer: "https://evil-site.com/page" }),
      );

      expect(result.valid).toBe(false);
      const body = await result.response?.json();
      expect(body.error).toBe("FORBIDDEN");
    });

    it("should reject malformed referer", () => {
      allowConsoleWarn();
      vi.stubEnv(
        "NEXT_PUBLIC_SITE_URL",
        "https://goldmustachebarbearia.com.br",
      );
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(makeRequest({ referer: "not-a-valid-url" }));

      expect(result.valid).toBe(false);
    });

    it("should allow requests with no origin and no referer", () => {
      vi.stubEnv("NODE_ENV", "production");

      const result = verifyOrigin(makeRequest());

      expect(result.valid).toBe(true);
    });
  });
});

describe("requireValidOrigin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return null for valid origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goldmustachebarbearia.com.br");
    vi.stubEnv("NODE_ENV", "production");

    const result = requireValidOrigin(
      makeRequest({ origin: "https://goldmustachebarbearia.com.br" }),
    );

    expect(result).toBeNull();
  });

  it("should return NextResponse with 403 for invalid origin", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goldmustachebarbearia.com.br");
    vi.stubEnv("NODE_ENV", "production");

    const result = requireValidOrigin(
      makeRequest({ origin: "https://evil-site.com" }),
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});
