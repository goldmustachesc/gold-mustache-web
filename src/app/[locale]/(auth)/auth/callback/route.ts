import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getSafeRedirectPath } from "@/utils/redirect";
import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // signup, email_change, recovery, etc.
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // Check if user signed in via OAuth (Google, etc.)
      // OAuth providers verify emails themselves, so we should mark as verified
      const isOAuthUser = isOAuthProviderUser(
        user.app_metadata as Record<string, unknown> | undefined,
      );

      console.info("[Auth Callback]", {
        type,
        userId: user.id,
        provider: user.app_metadata?.provider,
        isOAuth: isOAuthUser,
        timestamp: new Date().toISOString(),
      });

      // Mark email as verified if:
      // 1. This is an email verification callback (signup or email_change link clicked)
      // 2. User signed in via OAuth provider (Google, etc.) - they verify emails
      const shouldVerifyEmail =
        type === "signup" || type === "email_change" || isOAuthUser;

      if (shouldVerifyEmail) {
        try {
          await prisma.profile.updateMany({
            where: { userId: user.id },
            data: { emailVerified: true },
          });
        } catch (e) {
          // Log but don't fail the callback - user is already authenticated
          console.error("Failed to update emailVerified flag:", e);
        }
      }

      return NextResponse.redirect(
        `${getSafeCallbackRedirectOrigin(request)}${next}`,
      );
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
