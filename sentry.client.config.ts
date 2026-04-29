import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  debug: false,

  beforeSend(event) {
    // Strip PII from breadcrumbs and request data
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ["phone", "email", "password", "accessToken"]) {
        if (key in data) data[key] = "[REDACTED]";
      }
    }
    return event;
  },
});
