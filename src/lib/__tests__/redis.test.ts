import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("redis", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("expõe cliente nulo quando variáveis não estão definidas", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { redis, isRedisConfigured } = await import("../redis");

    expect(redis).toBeNull();
    expect(isRedisConfigured()).toBe(false);
  });

  it("alerta em produção quando Redis não está configurado", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    await import("../redis");

    expect(warnSpy).toHaveBeenCalled();
  });

  it("instancia cliente quando credenciais existem", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const { redis, isRedisConfigured } = await import("../redis");

    expect(redis).not.toBeNull();
    expect(isRedisConfigured()).toBe(true);
  });
});
