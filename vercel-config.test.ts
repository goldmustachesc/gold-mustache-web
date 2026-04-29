import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface VercelCronConfig {
  path: string;
  schedule: string;
}

interface VercelConfig {
  crons?: VercelCronConfig[];
}

function readVercelConfig(): VercelConfig {
  const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
  return JSON.parse(raw) as VercelConfig;
}

describe("vercel.json", () => {
  it("keeps only daily cron jobs on Vercel Hobby", () => {
    const config = readVercelConfig();

    expect(config.crons).toEqual([
      { path: "/api/cron/sync-instagram", schedule: "0 10 * * *" },
      { path: "/api/cron/loyalty/expire-points", schedule: "30 3 * * *" },
      {
        path: "/api/cron/loyalty/birthday-bonuses",
        schedule: "0 9 * * *",
      },
    ]);
  });
});
