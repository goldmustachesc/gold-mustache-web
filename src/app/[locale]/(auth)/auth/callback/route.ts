import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneOrNull } from "@/lib/booking/phone";
import { getSafeRedirectPath } from "@/utils/redirect";
import { NextResponse } from "next/server";
import { getSafeCallbackRedirectOrigin, isOAuthProviderUser } from "./utils";

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
          const phoneNormalized = normalizePhoneOrNull(
            user.user_metadata?.phone as null | string | undefined,
          );
          await prisma.profile.updateMany({
            where: { userId: user.id },
            data: {
              emailVerified: true,
              ...(phoneNormalized ? { phoneNormalized } : {}),
            },
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
