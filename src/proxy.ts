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

function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set("x-request-id", requestId);
  return response;
}

function applySessionCookies(
  response: NextResponse,
  sessionResponse: NextResponse,
): NextResponse {
  for (const cookie of sessionResponse.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  if (pathname.startsWith("/_next") || pathname.startsWith("/_vercel")) {
    return withRequestId(NextResponse.next({ request }), requestId);
  }

  if (!pathname.startsWith("/api") && /\.[^/]+$/.test(pathname)) {
    return withRequestId(NextResponse.next({ request }), requestId);
  }

  if (pathname.startsWith("/api") && isPublicApiRoute(pathname)) {
    return withRequestId(NextResponse.next({ request }), requestId);
  }

  if (pathname.startsWith("/api")) {
    const { supabaseResponse } = await updateSession(request);
    return withRequestId(supabaseResponse, requestId);
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
    return withRequestId(intlMiddleware(request), requestId);
  }

  const { supabaseResponse, user, authError } = await updateSession(request);

  if (authError) {
    const intlResponse = applySessionCookies(
      intlMiddleware(request),
      supabaseResponse,
    );
    intlResponse.headers.set("x-auth-refresh-error", "1");
    return withRequestId(intlResponse, requestId);
  }

  if (isAuthRoute && user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    return withRequestId(
      NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url)),
      requestId,
    );
  }

  if (isProtectedRoute && !user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return withRequestId(NextResponse.redirect(loginUrl), requestId);
  }

  const intlResponse = applySessionCookies(
    intlMiddleware(request),
    supabaseResponse,
  );

  return withRequestId(intlResponse, requestId);
}

export const config = {
  matcher: ["/", "/(pt-BR|es|en)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
