import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";
import { redis } from "@/lib/redis";

/**
 * Rate limiting with Upstash Redis (distributed) and in-memory fallback.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses
 * distributed sliding-window rate limiting via Upstash.
 * Otherwise falls back to a per-process in-memory fixed-window store —
 * suitable for development and single-instance deploys, but NOT for
 * multi-instance production. The fixed-window algorithm may allow up to 2×
 * the configured rate at window boundaries (acceptable trade-off for a
 * lightweight fallback that requires no external dependencies).
 */

const RATE_LIMIT_CONFIGS = {
  appointments: {
    maxRequests: 10,
    windowMs: 60_000,
    prefix: "ratelimit:appointments",
  },
  guestAppointments: {
    maxRequests: 5,
    windowMs: 60_000,
    prefix: "ratelimit:guest",
  },
  api: { maxRequests: 100, windowMs: 60_000, prefix: "ratelimit:api" },
  sensitive: {
    maxRequests: 3,
    windowMs: 60_000,
    prefix: "ratelimit:sensitive",
  },
} as const;

export type RateLimiterType = keyof typeof RATE_LIMIT_CONFIGS;

function buildRedisLimiters(redisClient: Redis) {
  return Object.fromEntries(
    Object.entries(RATE_LIMIT_CONFIGS).map(([key, config]) => [
      key,
      new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(config.maxRequests, "1 m"),
        prefix: config.prefix,
        analytics: true,
      }),
    ]),
  ) as Record<RateLimiterType, Ratelimit>;
}

const redisLimiters = redis ? buildRedisLimiters(redis) : null;

// --- In-memory fallback (fixed-window, per-process) ---

const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL_MS = 60_000;

if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore) {
      if (now > entry.resetAt) {
        inMemoryStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  timer.unref?.();
}

function inMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, reset: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    reset: entry.resetAt,
  };
}

// --- Public API ---

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given limiter and identifier.
 *
 * Uses Upstash Redis when configured, otherwise falls back to in-memory.
 *
 * @param limiterType - The type of rate limiter to use
 * @param identifier - Unique identifier for the client (usually IP or user ID)
 * @returns Rate limit result with success status and remaining requests
 *
 * @example
 * ```typescript
 * const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
 * const result = await checkRateLimit("guestAppointments", ip);
 * if (!result.success) {
 *   return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
 * }
 * ```
 */
export async function checkRateLimit(
  limiterType: RateLimiterType,
  identifier: string,
): Promise<RateLimitResult> {
  if (redisLimiters) {
    const limiter = redisLimiters[limiterType];
    const { success, remaining, reset } = await limiter.limit(identifier);
    return { success, remaining, reset };
  }

  const config = RATE_LIMIT_CONFIGS[limiterType];
  const key = `${limiterType}:${identifier}`;
  return inMemoryRateLimit(key, config.maxRequests, config.windowMs);
}

/**
 * Get client identifier from request headers.
 * Uses X-Forwarded-For for proxied requests (Vercel, Cloudflare),
 * falls back to a generic identifier.
 *
 * @param request - The incoming request
 * @returns Client identifier string
 */
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "anonymous";
}

/**
 * Whether the distributed (Redis-backed) rate limiter is active.
 * When false, the in-memory fixed-window fallback is being used.
 */
export function isDistributedRateLimiting(): boolean {
  return redisLimiters !== null;
}
