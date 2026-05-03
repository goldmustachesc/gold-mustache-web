import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { env: process.env.NODE_ENV },
  redact: {
    paths: [
      "*.email",
      "*.phone",
      "*.phoneNormalized",
      "*.password",
      "*.accessToken",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
});

export function childLogger(bindings: Record<string, string>) {
  return logger.child(bindings);
}
