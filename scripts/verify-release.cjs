#!/usr/bin/env node

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { response, body };
}

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function validateReleaseSnapshot(releaseData, env = process.env) {
  assertTruthy(
    releaseData && typeof releaseData === "object",
    "Invalid release snapshot",
  );
  assertTruthy(releaseData.git, "Release snapshot missing git info");
  assertTruthy(
    releaseData.environment,
    "Release snapshot missing environment info",
  );
  assertTruthy(releaseData.secrets, "Release snapshot missing secrets info");
  assertTruthy(
    releaseData.featureFlags,
    "Release snapshot missing feature flag info",
  );
  assertTruthy(releaseData.rollouts, "Release snapshot missing rollout info");
  assertTruthy(
    releaseData.rollouts.phoneNormalized,
    "Release snapshot missing phone rollout info",
  );
  assertTruthy(
    releaseData.rollouts.phoneNormalized.indexes,
    "Release snapshot missing phone rollout indexes",
  );

  assertTruthy(
    typeof releaseData.git.sha === "string" && releaseData.git.sha.length > 0,
    "Release snapshot missing git sha",
  );
  assertTruthy(
    typeof releaseData.git.ref === "string" && releaseData.git.ref.length > 0,
    "Release snapshot missing git ref",
  );
  assertTruthy(
    typeof releaseData.environment.current === "string" &&
      releaseData.environment.current.length > 0,
    "Release snapshot missing environment name",
  );
  assertTruthy(
    typeof releaseData.environment.siteUrl === "string" &&
      releaseData.environment.siteUrl.length > 0,
    "Release snapshot missing site url",
  );
  assertTruthy(
    typeof releaseData.environment.productionUrl === "string" &&
      releaseData.environment.productionUrl.length > 0,
    "Release snapshot missing production url",
  );

  if (env.VERCEL_GIT_COMMIT_SHA) {
    assertTruthy(
      releaseData.git.sha === env.VERCEL_GIT_COMMIT_SHA,
      `Unexpected git sha: ${releaseData.git.sha}`,
    );
  }

  if (env.VERCEL_GIT_COMMIT_REF) {
    assertTruthy(
      releaseData.git.ref === env.VERCEL_GIT_COMMIT_REF,
      `Unexpected git ref: ${releaseData.git.ref}`,
    );
  }

  assertTruthy(
    releaseData.secrets.cronSecret === true,
    "CRON_SECRET missing from release snapshot",
  );
  assertTruthy(
    releaseData.secrets.databaseUrl === true,
    "DATABASE_URL missing from release snapshot",
  );
  assertTruthy(
    releaseData.secrets.directUrl === true,
    "DIRECT_URL missing from release snapshot",
  );
  assertTruthy(
    releaseData.secrets.upstashRedisRestUrl === true,
    "UPSTASH_REDIS_REST_URL missing from release snapshot",
  );
  assertTruthy(
    releaseData.secrets.upstashRedisRestToken === true,
    "UPSTASH_REDIS_REST_TOKEN missing from release snapshot",
  );

  assertTruthy(
    releaseData.featureFlags.persistenceAvailable === true,
    "Feature flag persistence is unavailable in release snapshot",
  );
  assertTruthy(
    Array.isArray(releaseData.featureFlags.ops),
    "Release snapshot missing ops flags",
  );

  assertTruthy(
    releaseData.rollouts.phoneNormalized.migrationApplied === true,
    "phone_normalized migration not applied",
  );
  assertTruthy(
    releaseData.rollouts.phoneNormalized.columnExists === true,
    "phone_normalized column missing",
  );
  assertTruthy(
    releaseData.rollouts.phoneNormalized.indexes.profilesPhoneNormalized ===
      true,
    "profiles_phone_normalized_idx missing",
  );
  assertTruthy(
    releaseData.rollouts.phoneNormalized.indexes.appointmentsClientDate ===
      true,
    "appointments_client_id_date_idx missing",
  );
  assertTruthy(
    releaseData.rollouts.phoneNormalized.indexes.appointmentsGuestDate === true,
    "appointments_guest_client_id_date_idx missing",
  );
}

async function assertProtectedEndpoint(
  baseUrl,
  path,
  expectedStatus,
  options = {},
) {
  const result = await fetchJson(`${baseUrl}${path}`, options);
  assertTruthy(
    result.response.status === expectedStatus,
    `${path} returned ${result.response.status}, expected ${expectedStatus}`,
  );
}

async function main() {
  const baseUrl = requireEnv("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
  const cronSecret = requireEnv("CRON_SECRET");

  const release = await fetchJson(`${baseUrl}/api/ops/release`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  if (!release.response.ok) {
    console.error("Release endpoint failed:", release.body);
    process.exit(1);
  }

  validateReleaseSnapshot(release.body.data);

  const protectedCronChecks = [
    ["/api/cron/sync-instagram", 401],
    ["/api/cron/loyalty/expire-points", 401],
    ["/api/cron/loyalty/birthday-bonuses", 401],
    ["/api/cron/appointment-reminders", 405],
  ];

  for (const [path, expectedStatus] of protectedCronChecks) {
    await assertProtectedEndpoint(baseUrl, path, expectedStatus);
  }

  const healthChecks = [
    `${baseUrl}/pt-BR`,
    `${baseUrl}/api/services`,
    `${baseUrl}/api/barbers`,
    `${baseUrl}/robots.txt`,
    `${baseUrl}/sitemap.xml`,
  ];

  for (const url of healthChecks) {
    const result = await fetchJson(url);
    if (!result.response.ok) {
      console.error(`Health check failed for ${url}:`, result.body);
      process.exit(1);
    }
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  assertProtectedEndpoint,
  fetchJson,
  main,
  requireEnv,
  validateReleaseSnapshot,
};
