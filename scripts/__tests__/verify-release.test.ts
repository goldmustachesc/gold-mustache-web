import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { validateReleaseSnapshot } = require("../verify-release.cjs");

const validReleaseSnapshot = {
  git: {
    sha: "abc123",
    ref: "main",
    deploymentId: "dpl_123",
    url: "https://example.vercel.app",
  },
  environment: {
    current: "production",
    siteUrl: "https://www.example.com",
    productionUrl: "https://www.example.com",
  },
  secrets: {
    cronSecret: true,
    databaseUrl: true,
    directUrl: true,
    upstashRedisRestUrl: true,
    upstashRedisRestToken: true,
  },
  featureFlags: {
    persistenceAvailable: true,
    ops: [{ key: "appointmentReminders", enabled: true, source: "database" }],
  },
  rollouts: {
    phoneNormalized: {
      migrationApplied: true,
      columnExists: true,
      indexes: {
        profilesPhoneNormalized: true,
        appointmentsClientDate: true,
        appointmentsGuestDate: true,
      },
    },
  },
};

describe("verify-release", () => {
  it("accepts a complete release snapshot", () => {
    expect(() => validateReleaseSnapshot(validReleaseSnapshot)).not.toThrow();
  });

  it("rejects snapshots without rollout completion", () => {
    expect(() =>
      validateReleaseSnapshot({
        ...validReleaseSnapshot,
        rollouts: {
          phoneNormalized: {
            ...validReleaseSnapshot.rollouts.phoneNormalized,
            columnExists: false,
          },
        },
      }),
    ).toThrow("phone_normalized column missing");
  });

  it("rejects snapshots with missing cron secrets", () => {
    expect(() =>
      validateReleaseSnapshot({
        ...validReleaseSnapshot,
        secrets: {
          ...validReleaseSnapshot.secrets,
          cronSecret: false,
        },
      }),
    ).toThrow("CRON_SECRET missing from release snapshot");
  });
});
