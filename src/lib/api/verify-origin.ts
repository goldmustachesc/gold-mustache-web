import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";

function addOriginWithWwwVariant(origins: Set<string>, raw: string): void {
  const normalized = new URL(raw).origin;
  origins.add(normalized);

  const url = new URL(normalized);
  if (url.hostname.startsWith("www.")) {
    origins.add(`${url.protocol}//${url.hostname.slice(4)}`);
  } else {
    origins.add(`${url.protocol}//www.${url.hostname}`);
  }
}

function getAllowedOrigins(): string[] {
  const origins = new Set<string>();

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    addOriginWithWwwVariant(origins, process.env.NEXT_PUBLIC_SITE_URL);
  }

  if (process.env.ALLOWED_ORIGINS) {
    for (const entry of process.env.ALLOWED_ORIGINS.split(",")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      addOriginWithWwwVariant(origins, trimmed);
    }
  }

  if (process.env.VERCEL_URL) {
    origins.add(new URL(`https://${process.env.VERCEL_URL}`).origin);
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://127.0.0.1:3001");
  }

  return [...origins];
}

function getRequestHost(request: Request): string | null {
  return (
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    null
  );
}

function isOriginSameAsHost(origin: string, request: Request): boolean {
  const host = getRequestHost(request);
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Verify that the request Origin header matches an allowed origin.
 * Uses two-layer CSRF protection:
 *  1. Static allowed-origins list (from env vars)
 *  2. Same-origin check via Host header comparison (OWASP recommended)
 *
 * @param request - The incoming request
 * @returns true if origin is valid or missing (same-origin requests may not have Origin)
 *
 * @example
 * ```typescript
 * const originCheck = verifyOrigin(request);
 * if (!originCheck.valid) {
 *   return originCheck.response;
 * }
 * ```
 */
export function verifyOrigin(request: Request): {
  valid: boolean;
  response?: NextResponse;
} {
  const origin = request.headers.get("origin");

  if (!origin) {
    const referer = request.headers.get("referer");
    if (referer) {
      let refererOrigin: string;
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        console.warn("[Origin Verify] Malformed referer:", referer);
        return {
          valid: false,
          response: apiError("FORBIDDEN", "Origem não permitida", 403),
        };
      }
      const allowedOrigins = getAllowedOrigins();
      if (
        !allowedOrigins.includes(refererOrigin) &&
        !isOriginSameAsHost(refererOrigin, request)
      ) {
        console.warn("[Origin Verify] Invalid referer:", refererOrigin);
        return {
          valid: false,
          response: apiError("FORBIDDEN", "Origem não permitida", 403),
        };
      }
    }
    return { valid: true };
  }

  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    return { valid: true };
  }

  if (isOriginSameAsHost(origin, request)) {
    return { valid: true };
  }

  console.warn("[Origin Verify] Blocked request from:", origin);
  return {
    valid: false,
    response: apiError("FORBIDDEN", "Origem não permitida", 403),
  };
}

/**
 * Middleware helper that can be used to wrap sensitive routes.
 *
 * @example
 * ```typescript
 * export async function DELETE(request: Request) {
 *   const originError = requireValidOrigin(request);
 *   if (originError) return originError;
 *
 *   // ... rest of handler
 * }
 * ```
 */
export function requireValidOrigin(request: Request): NextResponse | null {
  const check = verifyOrigin(request);
  return check.valid ? null : (check.response as NextResponse);
}
