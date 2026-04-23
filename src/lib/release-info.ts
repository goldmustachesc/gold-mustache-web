import { siteConfig } from "@/config/site";
import { getPhoneNormalizedRolloutStatus } from "@/lib/database-rollouts";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import {
  getResolvedFeatureFlagsSnapshot,
  type ResolvedFeatureFlag,
} from "@/services/feature-flags";
import { resolveBookingMode } from "@/lib/booking-mode";

export interface ReleaseInfo {
  git: {
    sha: string | null;
    ref: string | null;
    deploymentId: string | null;
    url: string | null;
  };
  environment: {
    current: string;
    siteUrl: string;
    productionUrl: string;
  };
  booking: {
    mode: string;
  };
  secrets: {
    cronSecret: boolean;
    databaseUrl: boolean;
    directUrl: boolean;
    upstashRedisRestUrl: boolean;
    upstashRedisRestToken: boolean;
  };
  featureFlags: {
    persistenceAvailable: boolean;
    ops: Array<Pick<ResolvedFeatureFlag, "key" | "enabled" | "source">>;
  };
  rollouts: {
    phoneNormalized: {
      migrationApplied: boolean;
      columnExists: boolean;
      indexes: {
        profilesPhoneNormalized: boolean;
        appointmentsClientDate: boolean;
        appointmentsGuestDate: boolean;
      };
    };
  };
}

function hasEnvValue(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0);
}

export async function getReleaseInfo(): Promise<ReleaseInfo> {
  const [settings, flagsSnapshot, phoneNormalizedRollout] = await Promise.all([
    getBarbershopSettings(),
    getResolvedFeatureFlagsSnapshot({ bypassCache: true }),
    getPhoneNormalizedRolloutStatus(),
  ]);

  const opsFlags = flagsSnapshot.flags.filter(
    (flag) => flag.category === "ops",
  );

  return {
    git: {
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    },
    environment: {
      current: siteConfig.environment,
      siteUrl: siteConfig.baseUrl,
      productionUrl: siteConfig.productionUrl,
    },
    booking: {
      mode: resolveBookingMode(settings),
    },
    secrets: {
      cronSecret: hasEnvValue("CRON_SECRET"),
      databaseUrl: hasEnvValue("DATABASE_URL"),
      directUrl: hasEnvValue("DIRECT_URL"),
      upstashRedisRestUrl: hasEnvValue("UPSTASH_REDIS_REST_URL"),
      upstashRedisRestToken: hasEnvValue("UPSTASH_REDIS_REST_TOKEN"),
    },
    featureFlags: {
      persistenceAvailable: flagsSnapshot.persistenceAvailable,
      ops: opsFlags.map((flag) => ({
        key: flag.key,
        enabled: flag.enabled,
        source: flag.source,
      })),
    },
    rollouts: {
      phoneNormalized: phoneNormalizedRollout,
    },
  };
}
