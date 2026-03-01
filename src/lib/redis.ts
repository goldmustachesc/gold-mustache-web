import { Redis } from "@upstash/redis";

const isConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

if (!isConfigured && process.env.NODE_ENV === "production") {
  console.warn(
    "[redis] UPSTASH Redis not configured. " +
      "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
  );
}

export const redis = isConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

export function isRedisConfigured(): boolean {
  return redis !== null;
}
