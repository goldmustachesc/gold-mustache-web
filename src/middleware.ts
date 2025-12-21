import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./i18n/config";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/profile", "/settings", "/barbeiro"];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/signup", "/reset-password"];

function getPathnameWithoutLocale(pathname: string): string {
  const localePattern = new RegExp(`^/(${locales.join("|")})`);
  return pathname.replace(localePattern, "") || "/";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip i18n middleware for API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

  // Handle Supabase auth session refresh
  const { supabaseResponse, user } = await updateSession(request);

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route),
  );

  // Check if route is auth route
  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route),
  );

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Apply i18n middleware
  const intlResponse = intlMiddleware(request);

  // Merge cookies from Supabase response
  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  }

  return intlResponse;
}

export const config = {
  matcher: ["/", "/(pt-BR|es|en)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
