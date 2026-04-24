import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
  hasMigrationBeenApplied,
  isProductionEnvironment,
} = require("../enforce-production-migration-rollouts.cjs");

describe("enforce-production-migration-rollouts", () => {
  it("detects production environment from NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProductionEnvironment()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("requires finished_at and rolled_back_at checks to pass", async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ migration_name: "ok" }]),
    };

    await expect(
      hasMigrationBeenApplied(
        prisma,
        "20260423100000_add_phone_normalized_and_history_indexes",
      ),
    ).resolves.toBe(true);

    const query = String(prisma.$queryRaw.mock.calls[0]?.[0] ?? "");
    expect(query).toContain("finished_at IS NOT NULL");
    expect(query).toContain("rolled_back_at IS NULL");
  });
});
