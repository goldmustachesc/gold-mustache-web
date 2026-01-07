import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting configuration using Upstash Redis.
 *
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * If not configured, rate limiting will be disabled (no-op).
 */

const isConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = isConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

/**
 * Rate limiters for different endpoints with varying restrictions.
 * Returns null if Upstash is not configured (development fallback).
 */
export const rateLimiters = redis
  ? {
      /**
       * 10 requests per minute for authenticated appointment creation.
       * More permissive since user is authenticated.
       */
      appointments: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "ratelimit:appointments",
        analytics: true,
      }),
      /**
       * 5 requests per minute for guest appointments.
       * More restrictive to prevent spam/abuse.
       */
      guestAppointments: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        prefix: "ratelimit:guest",
        analytics: true,
      }),
      /**
       * 100 requests per minute for general API read operations.
       * Higher limit for normal usage patterns.
       */
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        prefix: "ratelimit:api",
        analytics: true,
      }),
      /**
       * 3 requests per minute for sensitive operations (delete, admin).
       * Very restrictive for security-critical endpoints.
       */
      sensitive: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 m"),
        prefix: "ratelimit:sensitive",
        analytics: true,
      }),
    }
  : null;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given limiter and identifier.
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
  limiterType: keyof NonNullable<typeof rateLimiters>,
  identifier: string,
): Promise<RateLimitResult> {
  // If rate limiting is not configured, allow all requests
  if (!rateLimiters) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const limiter = rateLimiters[limiterType];
  const { success, remaining, reset } = await limiter.limit(identifier);

  return { success, remaining, reset };
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
  // X-Forwarded-For may contain multiple IPs, use the first one (client IP)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // X-Real-IP is used by some proxies
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback for development or unknown source
  return "anonymous";
}

/**
 * Check if rate limiting is configured and available.
 */
export function isRateLimitingEnabled(): boolean {
  return rateLimiters !== null;
}
