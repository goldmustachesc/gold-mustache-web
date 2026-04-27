import { describe, expect, it } from "vitest";
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_REGISTRY,
  featureFlagEnvVarName,
  getFeatureFlagEnvOverride,
  isFeatureFlagKey,
  parseFeatureFlagEnvOverride,
} from "../feature-flags";

describe("feature flag registry", () => {
  it("lista todas as chaves conhecidas", () => {
    expect(FEATURE_FLAG_KEYS.length).toBe(6);
    expect(FEATURE_FLAG_KEYS).toContain("loyaltyProgram");
    expect(FEATURE_FLAG_KEYS).toContain("referralProgram");
    expect(FEATURE_FLAG_KEYS).toContain("eventsSection");
    expect(FEATURE_FLAG_KEYS).toContain("transactionalEmails");
    expect(FEATURE_FLAG_KEYS).toContain("appointmentReminders");
    expect(FEATURE_FLAG_KEYS).toContain("appointmentRemindersWhatsapp");
  });

  it("cada entrada do registry referencia a propria chave", () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(FEATURE_FLAG_REGISTRY[key].key).toBe(key);
      expect(FEATURE_FLAG_REGISTRY[key].description.length).toBeGreaterThan(0);
    }
  });

  it("isFeatureFlagKey valida apenas chaves registradas", () => {
    expect(isFeatureFlagKey("loyaltyProgram")).toBe(true);
    expect(isFeatureFlagKey("unknown")).toBe(false);
  });
});

describe("feature flag env helpers", () => {
  it("mapeia chave camelCase para nome de variavel FEATURE_FLAG_", () => {
    expect(featureFlagEnvVarName("loyaltyProgram")).toBe(
      "FEATURE_FLAG_LOYALTY_PROGRAM",
    );
    expect(featureFlagEnvVarName("referralProgram")).toBe(
      "FEATURE_FLAG_REFERRAL_PROGRAM",
    );
    expect(featureFlagEnvVarName("eventsSection")).toBe(
      "FEATURE_FLAG_EVENTS_SECTION",
    );
    expect(featureFlagEnvVarName("transactionalEmails")).toBe(
      "FEATURE_FLAG_TRANSACTIONAL_EMAILS",
    );
    expect(featureFlagEnvVarName("appointmentReminders")).toBe(
      "FEATURE_FLAG_APPOINTMENT_REMINDERS",
    );
    expect(featureFlagEnvVarName("appointmentRemindersWhatsapp")).toBe(
      "FEATURE_FLAG_APPOINTMENT_REMINDERS_WHATSAPP",
    );
  });

  it("parseFeatureFlagEnvOverride interpreta valores comuns", () => {
    expect(parseFeatureFlagEnvOverride(undefined)).toBeNull();
    expect(parseFeatureFlagEnvOverride("")).toBeNull();
    expect(parseFeatureFlagEnvOverride("true")).toBe(true);
    expect(parseFeatureFlagEnvOverride("TRUE")).toBe(true);
    expect(parseFeatureFlagEnvOverride("1")).toBe(true);
    expect(parseFeatureFlagEnvOverride("yes")).toBe(true);
    expect(parseFeatureFlagEnvOverride("false")).toBe(false);
    expect(parseFeatureFlagEnvOverride("0")).toBe(false);
    expect(parseFeatureFlagEnvOverride("no")).toBe(false);
    expect(parseFeatureFlagEnvOverride("maybe")).toBeNull();
  });

  it("getFeatureFlagEnvOverride le process.env com nome esperado", () => {
    const name = featureFlagEnvVarName("loyaltyProgram");
    const previous = process.env[name];
    try {
      process.env[name] = "true";
      expect(getFeatureFlagEnvOverride("loyaltyProgram")).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previous;
      }
    }
  });
});
