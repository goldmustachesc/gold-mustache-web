export type FeatureFlagCategory = "infra" | "product" | "ops";

export type FeatureFlagKey =
  | "loyaltyProgram"
  | "referralProgram"
  | "eventsSection"
  | "transactionalEmails"
  | "appointmentReminders"
  | "appointmentRemindersWhatsapp";

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  description: string;
  defaultValue: boolean;
  clientSafe: boolean;
  category: FeatureFlagCategory;
}

export const FEATURE_FLAG_REGISTRY = {
  loyaltyProgram: {
    key: "loyaltyProgram",
    description: "Programa de fidelidade",
    defaultValue: false,
    clientSafe: true,
    category: "product",
  },
  referralProgram: {
    key: "referralProgram",
    description: "Programa de indicação",
    defaultValue: false,
    clientSafe: true,
    category: "product",
  },
  eventsSection: {
    key: "eventsSection",
    description: "Seção de eventos no site",
    defaultValue: false,
    clientSafe: true,
    category: "product",
  },
  transactionalEmails: {
    key: "transactionalEmails",
    description: "Envio de emails transacionais",
    defaultValue: false,
    clientSafe: false,
    category: "ops",
  },
  appointmentReminders: {
    key: "appointmentReminders",
    description: "Lembretes automáticos de agendamentos (cron)",
    defaultValue: false,
    clientSafe: false,
    category: "ops",
  },
  appointmentRemindersWhatsapp: {
    key: "appointmentRemindersWhatsapp",
    description: "Canal WhatsApp para lembretes automáticos",
    defaultValue: false,
    clientSafe: false,
    category: "ops",
  },
} as const satisfies Record<FeatureFlagKey, FeatureFlagDefinition>;

export const FEATURE_FLAG_KEYS = Object.keys(
  FEATURE_FLAG_REGISTRY,
) as FeatureFlagKey[];

export function featureFlagEnvVarName(key: FeatureFlagKey): string {
  const snake = key.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
  return `FEATURE_FLAG_${snake}`;
}

export function parseFeatureFlagEnvOverride(
  value: string | undefined,
): boolean | null {
  if (value === undefined || value === "") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return null;
}

export function getFeatureFlagEnvOverride(key: FeatureFlagKey): boolean | null {
  return parseFeatureFlagEnvOverride(process.env[featureFlagEnvVarName(key)]);
}

type ClientSafeKeys = {
  [K in FeatureFlagKey]: (typeof FEATURE_FLAG_REGISTRY)[K]["clientSafe"] extends true
    ? K
    : never;
}[FeatureFlagKey];

export type ClientFeatureFlags = { [K in ClientSafeKeys]: boolean };

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_KEYS.includes(value as FeatureFlagKey);
}
