import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/release-info", () => ({
  getReleaseInfo: vi.fn(),
}));

import { GET } from "../route";
import { getReleaseInfo } from "@/lib/release-info";

describe("GET /api/ops/release", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NEXT_PUBLIC_ENVIRONMENT = "staging";
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.example.com";
    process.env.VERCEL_GIT_COMMIT_SHA = "abc123";
    process.env.VERCEL_GIT_COMMIT_REF = "staging";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_123";
  });

  it("blocks requests without the bearer secret", async () => {
    const response = await GET(
      new Request("http://localhost:3001/api/ops/release"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "UNAUTHORIZED",
      message: "Não autorizado",
    });
  });

  it("returns the release snapshot with the bearer secret", async () => {
    vi.mocked(getReleaseInfo).mockResolvedValue({
      git: {
        sha: "abc123",
        ref: "staging",
        deploymentId: "dpl_123",
        url: "https://example.vercel.app",
      },
      environment: {
        current: "staging",
        siteUrl: "https://staging.example.com",
        productionUrl: "https://www.example.com",
      },
      booking: {
        mode: "internal",
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
        ops: [
          { key: "appointmentReminders", enabled: true, source: "database" },
        ],
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
    });

    const response = await GET(
      new Request("http://localhost:3001/api/ops/release", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.git.sha).toBe("abc123");
    expect(body.data.featureFlags.ops).toEqual([
      { key: "appointmentReminders", enabled: true, source: "database" },
    ]);
    expect(body.data.secrets.cronSecret).toBe(true);
  });
});
