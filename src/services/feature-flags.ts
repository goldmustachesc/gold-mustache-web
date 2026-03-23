import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_REGISTRY,
  type ClientFeatureFlags,
  type FeatureFlagCategory,
  type FeatureFlagKey,
  getFeatureFlagEnvOverride,
  isFeatureFlagKey,
} from "@/config/feature-flags";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const FEATURE_FLAGS_CACHE_TAG = "feature-flags";
const FEATURE_FLAGS_CACHE_TTL_SECONDS = 300;

export type FeatureFlagSource = "env" | "database" | "default";

export interface ResolvedFeatureFlag {
  key: FeatureFlagKey;
  enabled: boolean;
  defaultValue: boolean;
  clientSafe: boolean;
  description: string;
  category: FeatureFlagCategory;
  source: FeatureFlagSource;
}

async function loadDbFlags(): Promise<Map<FeatureFlagKey, boolean>> {
  try {
    const rows = await prisma.featureFlag.findMany();
    const map = new Map<FeatureFlagKey, boolean>();
    for (const row of rows) {
      if (isFeatureFlagKey(row.key)) {
        map.set(row.key, row.enabled);
      }
    }
    return map;
  } catch (error) {
    console.error("Error fetching feature flags from DB:", error);
    return new Map();
  }
}

function resolveAll(db: Map<FeatureFlagKey, boolean>): ResolvedFeatureFlag[] {
  return FEATURE_FLAG_KEYS.map((key) => {
    const def = FEATURE_FLAG_REGISTRY[key];
    const envOverride = getFeatureFlagEnvOverride(key);
    if (envOverride !== null) {
      return {
        key,
        enabled: envOverride,
        defaultValue: def.defaultValue,
        clientSafe: def.clientSafe,
        description: def.description,
        category: def.category,
        source: "env",
      };
    }
    if (db.has(key)) {
      return {
        key,
        enabled: db.get(key) ?? def.defaultValue,
        defaultValue: def.defaultValue,
        clientSafe: def.clientSafe,
        description: def.description,
        category: def.category,
        source: "database",
      };
    }
    return {
      key,
      enabled: def.defaultValue,
      defaultValue: def.defaultValue,
      clientSafe: def.clientSafe,
      description: def.description,
      category: def.category,
      source: "default",
    };
  });
}

async function getResolvedFeatureFlagsUncached(): Promise<
  ResolvedFeatureFlag[]
> {
  const db = await loadDbFlags();
  return resolveAll(db);
}

const getResolvedFeatureFlagsCached = unstable_cache(
  getResolvedFeatureFlagsUncached,
  ["feature-flags-resolved"],
  {
    tags: [FEATURE_FLAGS_CACHE_TAG],
    revalidate: FEATURE_FLAGS_CACHE_TTL_SECONDS,
  },
);

export async function getResolvedFeatureFlags(): Promise<
  ResolvedFeatureFlag[]
> {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    return getResolvedFeatureFlagsUncached();
  }

  try {
    return await getResolvedFeatureFlagsCached();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("incrementalCache missing")
    ) {
      return getResolvedFeatureFlagsUncached();
    }
    throw error;
  }
}

export async function getFeatureFlags(): Promise<
  Record<FeatureFlagKey, boolean>
> {
  const resolved = await getResolvedFeatureFlags();
  return resolved.reduce(
    (acc, item) => {
      acc[item.key] = item.enabled;
      return acc;
    },
    {} as Record<FeatureFlagKey, boolean>,
  );
}

export async function getClientFeatureFlags(): Promise<ClientFeatureFlags> {
  const resolved = await getResolvedFeatureFlags();
  const out = {} as Record<string, boolean>;
  for (const item of resolved) {
    if (item.clientSafe) {
      out[item.key] = item.enabled;
    }
  }
  return out as ClientFeatureFlags;
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[key];
}
