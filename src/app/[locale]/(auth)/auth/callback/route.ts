import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // signup, email_change, recovery, etc.
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // Check if user signed in via OAuth (Google, etc.)
      // OAuth providers verify emails themselves, so we should mark as verified
      const isOAuthUser =
        user.app_metadata?.provider !== "email" &&
        user.app_metadata?.providers?.some(
          (p: string) => p !== "email" && p !== "phone",
        );

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

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
