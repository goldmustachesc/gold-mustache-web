import * as Sentry from "@sentry/nextjs";

function redactSensitiveRequestData(
  event: Sentry.ErrorEvent,
): Sentry.ErrorEvent {
  const data = event.request?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return event;
  }

  const redactedData = { ...(data as Record<string, unknown>) };
  for (const key of ["phone", "email", "password", "accessToken"]) {
    if (key in redactedData) redactedData[key] = "[REDACTED]";
  }

  return {
    ...event,
    request: {
      ...event.request,
      data: redactedData,
    },
  } as Sentry.ErrorEvent;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  debug: false,

  beforeSend(event) {
    return redactSensitiveRequestData(event);
  },
});
