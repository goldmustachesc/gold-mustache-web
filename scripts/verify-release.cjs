#!/usr/bin/env node

const { setTimeout: sleep } = require("node:timers/promises");

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

  const releaseData = release.body.data;
  console.log(JSON.stringify(releaseData, null, 2));

  const cron = await fetchJson(`${baseUrl}/api/cron/appointment-reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  if (!cron.response.ok) {
    console.error("Appointment reminder cron failed:", cron.body);
    process.exit(1);
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

  await sleep(0);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
