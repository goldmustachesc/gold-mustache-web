import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

async function importFreshSiteConfig() {
  vi.resetModules();
  return import("../site");
}

describe("siteConfig", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("prioriza NEXT_PUBLIC_ENVIRONMENT quando o valor e valido", async () => {
    process.env.NEXT_PUBLIC_ENVIRONMENT = "production";
    process.env.VERCEL_ENV = "preview";

    const { siteConfig } = await importFreshSiteConfig();

    expect(siteConfig.environment).toBe("production");
    expect(siteConfig.isProduction).toBe(true);
    expect(siteConfig.isStaging).toBe(false);
    expect(siteConfig.allowCrawlers).toBe(true);
    expect(siteConfig.enableAnalytics).toBe(true);
  });

  it("infere staging a partir do VERCEL_ENV=preview quando nao ha env publica valida", async () => {
    delete process.env.NEXT_PUBLIC_ENVIRONMENT;
    process.env.VERCEL_ENV = "preview";

    const { siteConfig } = await importFreshSiteConfig();

    expect(siteConfig.environment).toBe("staging");
    expect(siteConfig.isStaging).toBe(true);
    expect(siteConfig.isProduction).toBe(false);
    expect(siteConfig.allowCrawlers).toBe(false);
    expect(siteConfig.enableAnalytics).toBe(false);
  });

  it("faz fallback para development quando as envs nao definem ambiente valido", async () => {
    process.env.NEXT_PUBLIC_ENVIRONMENT = "qa";
    delete process.env.VERCEL_ENV;

    const { siteConfig } = await importFreshSiteConfig();

    expect(siteConfig.environment).toBe("development");
    expect(siteConfig.isDevelopment).toBe(true);
    expect(siteConfig.baseUrl).toBe("http://localhost:3001");
  });

  it("prioriza NEXT_PUBLIC_SITE_URL sobre VERCEL_URL ao resolver a baseUrl", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.goldmustache.com";
    process.env.VERCEL_URL = "gold-mustache-web.vercel.app";

    const { siteConfig } = await importFreshSiteConfig();

    expect(siteConfig.baseUrl).toBe("https://staging.goldmustache.com");
  });

  it("usa VERCEL_URL quando NEXT_PUBLIC_SITE_URL nao esta definida", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "gold-mustache-web.vercel.app";

    const { siteConfig } = await importFreshSiteConfig();

    expect(siteConfig.baseUrl).toBe("https://gold-mustache-web.vercel.app");
    expect(siteConfig.productionUrl).toBe(
      "https://www.goldmustachebarbearia.com.br",
    );
  });
});
