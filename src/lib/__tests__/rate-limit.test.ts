import { describe, it, expect, vi, beforeEach } from "vitest";

describe("rate-limit module", () => {
  describe("checkRateLimit with in-memory fallback (no Redis)", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.doMock("@/lib/redis", () => ({ redis: null }));
    });

    it("returns success on first request", async () => {
      const { checkRateLimit } = await import("../rate-limit");
      const result = await checkRateLimit("api", "test-client-inmem");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it("enforces max requests limit", async () => {
      const { checkRateLimit } = await import("../rate-limit");

      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit("sensitive", "limit-enforce-test");
        expect(result.success).toBe(true);
      }

      const exceeded = await checkRateLimit("sensitive", "limit-enforce-test");
      expect(exceeded.success).toBe(false);
      expect(exceeded.remaining).toBe(0);
    });
  });

  describe("checkRateLimit when Redis throws (fail-open)", () => {
    const mockLimit = vi.fn();

    beforeEach(() => {
      vi.resetModules();
      mockLimit.mockRejectedValue(new Error("Redis connection failed"));

      vi.doMock("@/lib/redis", () => ({
        redis: { url: "fake-url", token: "fake-token" },
      }));

      vi.doMock("@upstash/ratelimit", () => ({
        Ratelimit: class MockRatelimit {
          static slidingWindow() {
            return "mock-algorithm";
          }
          limit = mockLimit;
        },
      }));
    });

    it("does not throw when Redis limiter fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { checkRateLimit } = await import("../rate-limit");

      await expect(checkRateLimit("api", "test-client")).resolves.toBeDefined();
    });

    it("falls back to in-memory and returns a successful result", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { checkRateLimit } = await import("../rate-limit");

      const result = await checkRateLimit("api", "test-client");

      expect(result.success).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it("logs the Redis error to console.error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { checkRateLimit } = await import("../rate-limit");

      await checkRateLimit("api", "test-client");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[rate-limit]"),
        expect.any(Error),
      );
    });
  });

  describe("getClientIdentifier", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.doMock("@/lib/redis", () => ({ redis: null }));
    });

    it("extracts first IP from x-forwarded-for", async () => {
      const { getClientIdentifier } = await import("../rate-limit");
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      });

      expect(getClientIdentifier(request)).toBe("1.2.3.4");
    });

    it("uses x-real-ip when x-forwarded-for is absent", async () => {
      const { getClientIdentifier } = await import("../rate-limit");
      const request = new Request("http://localhost/api/test", {
        headers: { "x-real-ip": "10.0.0.1" },
      });

      expect(getClientIdentifier(request)).toBe("10.0.0.1");
    });

    it("returns 'anonymous' when no IP headers present", async () => {
      const { getClientIdentifier } = await import("../rate-limit");
      const request = new Request("http://localhost/api/test");

      expect(getClientIdentifier(request)).toBe("anonymous");
    });
  });
});
