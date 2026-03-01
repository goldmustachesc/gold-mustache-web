import type { InstagramCacheData } from "@/types/instagram";
import { redis } from "@/lib/redis";

const CACHE_KEY = "instagram:cache";
const CACHE_TTL_SECONDS = 25 * 60 * 60; // 25 hours — covers daily cron + buffer

export async function setInstagramCache(
  data: InstagramCacheData,
): Promise<void> {
  if (!redis) {
    console.warn(
      "[instagram-cache] Redis not configured, skipping cache write",
    );
    return;
  }

  await redis.set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL_SECONDS });
}

export async function getInstagramCache(): Promise<InstagramCacheData | null> {
  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.get<string>(CACHE_KEY);
    if (!raw) return null;

    const data: InstagramCacheData =
      typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!data.posts || data.posts.length === 0) return null;

    return data;
  } catch (error) {
    console.error("[instagram-cache] Failed to read cache:", error);
    return null;
  }
}
