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

    it("extracts first IP from x-forwarded-for with ip: prefix", async () => {
      const { getClientIdentifier } = await import("../rate-limit");
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      });

      expect(getClientIdentifier(request)).toBe("ip:1.2.3.4");
    });

    it("uses x-real-ip when x-forwarded-for is absent", async () => {
      const { getClientIdentifier } = await import("../rate-limit");
      const request = new Request("http://localhost/api/test", {
        headers: { "x-real-ip": "10.0.0.1" },
      });

      expect(getClientIdentifier(request)).toBe("ip:10.0.0.1");
    });

    it("returns 'ip:anonymous' when no IP headers present", async () => {
      const { getClientIdentifier } = await import("../rate-limit");
      const request = new Request("http://localhost/api/test");

      expect(getClientIdentifier(request)).toBe("ip:anonymous");
    });
  });

  describe("getUserRateLimitIdentifier", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.doMock("@/lib/redis", () => ({ redis: null }));
    });

    it("prefixes authenticated user IDs with auth:", async () => {
      const { getUserRateLimitIdentifier } = await import("../rate-limit");

      expect(getUserRateLimitIdentifier("user-123")).toBe("auth:user-123");
    });
  });

  describe("namespace isolation", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.doMock("@/lib/redis", () => ({ redis: null }));
    });

    it("auth and client identifiers never share the same bucket", async () => {
      const { getUserRateLimitIdentifier, getClientIdentifier } = await import(
        "../rate-limit"
      );

      const authId = getUserRateLimitIdentifier("user-123");
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "user-123" },
      });
      const clientId = getClientIdentifier(request);

      expect(authId).not.toBe(clientId);
      expect(authId).toBe("auth:user-123");
      expect(clientId).toBe("ip:user-123");
    });

    it("crafted header cannot target an authenticated user bucket", async () => {
      const {
        checkRateLimit,
        getUserRateLimitIdentifier,
        getClientIdentifier,
      } = await import("../rate-limit");

      const authId = getUserRateLimitIdentifier("victim-id");
      const spoofedRequest = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "auth:victim-id" },
      });
      const spoofedClientId = getClientIdentifier(spoofedRequest);

      expect(spoofedClientId).not.toBe(authId);

      for (let i = 0; i < 3; i++) {
        await checkRateLimit("sensitive", spoofedClientId);
      }

      const authResult = await checkRateLimit("sensitive", authId);
      expect(authResult.success).toBe(true);
    });
  });
});
