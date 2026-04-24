import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./i18n/config";
import { isPublicApiRoute } from "./lib/middleware/public-routes";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const protectedRoutes = ["/dashboard", "/profile", "/barbeiro", "/admin"];

const authRoutes = ["/login", "/signup", "/reset-password"];

function getPathnameWithoutLocale(pathname: string): string {
  const localePattern = new RegExp(`^/(${locales.join("|")})`);
  return pathname.replace(localePattern, "") || "/";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/_next") || pathname.startsWith("/_vercel")) {
    return NextResponse.next({ request });
  }

  if (!pathname.startsWith("/api") && /\.[^/]+$/.test(pathname)) {
    return NextResponse.next({ request });
  }

  if (pathname.startsWith("/api") && isPublicApiRoute(pathname)) {
    return NextResponse.next({ request });
  }

  if (pathname.startsWith("/api")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route),
  );

  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route),
  );

  const needsSession = isProtectedRoute || isAuthRoute;

  if (!needsSession) {
    return intlMiddleware(request);
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (isProtectedRoute && !user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  const intlResponse = intlMiddleware(request);

  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  }

  return intlResponse;
}

export const config = {
  matcher: ["/", "/(pt-BR|es|en)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
