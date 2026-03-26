import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    featureFlag: {
      findMany: vi.fn(),
    },
  };
  return { prisma };
});

import { prisma } from "@/lib/prisma";
import { featureFlagEnvVarName } from "@/config/feature-flags";
import {
  getClientFeatureFlags,
  getFeatureFlags,
  getResolvedFeatureFlags,
  isFeatureEnabled,
} from "../feature-flags";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("services/feature-flags", () => {
  const loyaltyEnv = featureFlagEnvVarName("loyaltyProgram");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env[loyaltyEnv];
    delete process.env[featureFlagEnvVarName("referralProgram")];
    delete process.env[featureFlagEnvVarName("eventsSection")];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("usa default quando nao ha env nem linha no banco", async () => {
    asMock(prisma.featureFlag.findMany).mockResolvedValue([]);

    const flags = await getFeatureFlags();
    expect(flags.loyaltyProgram).toBe(false);
    expect(flags.referralProgram).toBe(false);
    expect(flags.eventsSection).toBe(false);

    const resolved = await getResolvedFeatureFlags();
    expect(resolved.find((r) => r.key === "loyaltyProgram")?.source).toBe(
      "default",
    );
  });

  it("prioriza env sobre banco e default", async () => {
    process.env[loyaltyEnv] = "true";
    asMock(prisma.featureFlag.findMany).mockResolvedValue([
      { key: "loyaltyProgram", enabled: false, description: null },
    ]);

    const flags = await getFeatureFlags();
    expect(flags.loyaltyProgram).toBe(true);

    const resolved = await getResolvedFeatureFlags();
    expect(resolved.find((r) => r.key === "loyaltyProgram")?.source).toBe(
      "env",
    );
  });

  it("usa banco quando nao ha override de env", async () => {
    asMock(prisma.featureFlag.findMany).mockResolvedValue([
      { key: "loyaltyProgram", enabled: true, description: "x" },
    ]);

    const flags = await getFeatureFlags();
    expect(flags.loyaltyProgram).toBe(true);

    const resolved = await getResolvedFeatureFlags();
    expect(resolved.find((r) => r.key === "loyaltyProgram")?.source).toBe(
      "database",
    );
  });

  it("ignora linhas de banco com chave desconhecida", async () => {
    asMock(prisma.featureFlag.findMany).mockResolvedValue([
      { key: "unknownKey", enabled: true, description: null },
    ]);

    const flags = await getFeatureFlags();
    expect(flags.loyaltyProgram).toBe(false);
  });

  it("getClientFeatureFlags retorna apenas flags clientSafe", async () => {
    asMock(prisma.featureFlag.findMany).mockResolvedValue([]);

    const client = await getClientFeatureFlags();
    expect(Object.keys(client).sort()).toEqual([
      "eventsSection",
      "loyaltyProgram",
      "referralProgram",
    ]);
    expect(client.loyaltyProgram).toBe(false);
  });

  it("isFeatureEnabled reflete o valor resolvido", async () => {
    asMock(prisma.featureFlag.findMany).mockResolvedValue([
      { key: "eventsSection", enabled: true, description: null },
    ]);

    expect(await isFeatureEnabled("eventsSection")).toBe(true);
    expect(await isFeatureEnabled("loyaltyProgram")).toBe(false);
  });

  it("quando findMany falha, aplica defaults e env sem lancar", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    asMock(prisma.featureFlag.findMany).mockRejectedValue(new Error("DB down"));

    process.env[featureFlagEnvVarName("referralProgram")] = "true";

    const flags = await getFeatureFlags();
    expect(flags.loyaltyProgram).toBe(false);
    expect(flags.referralProgram).toBe(true);

    consoleSpy.mockRestore();
  });
});
