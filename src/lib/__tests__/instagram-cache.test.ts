import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstagramCacheData } from "@/types/instagram";

const sampleCache: InstagramCacheData = {
  posts: [
    {
      id: "post-1",
      mediaType: "IMAGE",
      image: "https://example.com/post-1.jpg",
      url: "https://instagram.com/p/post-1",
      caption: "Legenda 1",
      timestamp: "2026-03-19T10:00:00.000Z",
    },
  ],
  lastUpdated: "2026-03-19T10:00:00.000Z",
  source: "api",
};

describe("instagram-cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("ignora escrita quando redis nao esta configurado", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.doMock("@/lib/redis", () => ({ redis: null }));

    const { setInstagramCache } = await import("../instagram-cache");

    await expect(setInstagramCache(sampleCache)).resolves.toBeUndefined();
    expect(consoleWarn).toHaveBeenCalledWith(
      "[instagram-cache] Redis not configured, skipping cache write",
    );
  });

  it("salva o cache com a chave e TTL corretos quando redis existe", async () => {
    const set = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/redis", () => ({
      redis: { set },
    }));

    const { setInstagramCache } = await import("../instagram-cache");

    await setInstagramCache(sampleCache);

    expect(set).toHaveBeenCalledWith(
      "instagram:cache",
      JSON.stringify(sampleCache),
      { ex: 25 * 60 * 60 },
    );
  });

  it("retorna null quando redis nao esta configurado ou quando nao ha posts validos", async () => {
    vi.doMock("@/lib/redis", () => ({ redis: null }));

    const { getInstagramCache } = await import("../instagram-cache");

    await expect(getInstagramCache()).resolves.toBeNull();

    vi.resetModules();

    const get = vi
      .fn()
      .mockResolvedValue({ posts: [], syncedAt: "2026-03-19" });
    vi.doMock("@/lib/redis", () => ({
      redis: { get },
    }));

    const moduleWithRedis = await import("../instagram-cache");

    await expect(moduleWithRedis.getInstagramCache()).resolves.toBeNull();
  });

  it("retorna o cache parseado quando redis devolve string JSON", async () => {
    const get = vi.fn().mockResolvedValue(JSON.stringify(sampleCache));

    vi.doMock("@/lib/redis", () => ({
      redis: { get },
    }));

    const { getInstagramCache } = await import("../instagram-cache");

    await expect(getInstagramCache()).resolves.toEqual(sampleCache);
    expect(get).toHaveBeenCalledWith("instagram:cache");
  });

  it("retorna null e faz log quando a leitura do redis falha", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const redisError = new Error("redis unavailable");
    const get = vi.fn().mockRejectedValue(redisError);

    vi.doMock("@/lib/redis", () => ({
      redis: { get },
    }));

    const { getInstagramCache } = await import("../instagram-cache");

    await expect(getInstagramCache()).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "[instagram-cache] Failed to read cache:",
      redisError,
    );
  });
});
