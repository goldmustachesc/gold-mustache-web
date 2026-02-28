/**
 * Centralized API configuration constants.
 *
 * Values that may vary per environment read from env vars with sensible defaults.
 * Keeps "magic numbers" in one place so changes propagate automatically.
 */

export const API_CONFIG = {
  instagram: {
    maxRetries: Number(process.env.INSTAGRAM_MAX_RETRIES ?? 3),
    postsLimit: Number(process.env.INSTAGRAM_POSTS_LIMIT ?? 10),
    retryBaseDelayMs: 1_000,
  },

  cron: {
    guestCleanupBatchSize: 50,
  },

  appointments: {
    defaultRangeMs: 7 * 24 * 60 * 60 * 1_000, // 7 days
  },

  slugGeneration: {
    maxAttempts: 100,
  },
} as const;
