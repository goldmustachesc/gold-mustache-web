function getValidOrigin(candidate: string | undefined | null): string | null {
  if (!candidate) return null;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

export function isOAuthProviderUser(
  appMetadata: Record<string, unknown> | undefined,
): boolean {
  const provider =
    typeof appMetadata?.provider === "string" ? appMetadata.provider : null;
  const providers = Array.isArray(appMetadata?.providers)
    ? appMetadata.providers.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return (
    (provider !== null && provider !== "email" && provider !== "phone") ||
    providers.some((value) => value !== "email" && value !== "phone")
  );
}

export function getSafeCallbackRedirectOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;

  if (process.env.NODE_ENV === "development") {
    return requestOrigin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.toLowerCase();
  const configuredSiteOrigin = getValidOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const vercelOrigin = getValidOrigin(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  );
  const allowedOrigins = [
    configuredSiteOrigin,
    vercelOrigin,
    requestOrigin,
  ].filter((value): value is string => Boolean(value));

  if (forwardedHost) {
    const trustedForwardedOrigin = allowedOrigins.find((value) => {
      try {
        return new URL(value).host.toLowerCase() === forwardedHost;
      } catch {
        return false;
      }
    });

    if (trustedForwardedOrigin) {
      return trustedForwardedOrigin;
    }
  }

  return configuredSiteOrigin ?? requestOrigin;
}
