import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";

function normalizeToOrigin(raw: string): string {
  return new URL(raw).origin;
}

function getAllowedOrigins(): string[] {
  const origins = new Set<string>();

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const normalized = normalizeToOrigin(process.env.NEXT_PUBLIC_SITE_URL);
    origins.add(normalized);

    const url = new URL(normalized);
    if (url.hostname.startsWith("www.")) {
      origins.add(`${url.protocol}//${url.hostname.slice(4)}`);
    } else {
      origins.add(`${url.protocol}//www.${url.hostname}`);
    }
  }

  if (process.env.VERCEL_URL) {
    origins.add(normalizeToOrigin(`https://${process.env.VERCEL_URL}`));
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://127.0.0.1:3001");
  }

  return [...origins];
}

/**
 * Verify that the request Origin header matches an allowed origin.
 * Used for CSRF protection on sensitive endpoints.
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

  // No origin header usually means same-origin request (e.g., form submissions)
  // However, some browsers may not send it for API calls
  if (!origin) {
    // Check Referer as fallback
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
      if (!allowedOrigins.includes(refererOrigin)) {
        console.warn("[Origin Verify] Invalid referer:", refererOrigin);
        return {
          valid: false,
          response: apiError("FORBIDDEN", "Origem não permitida", 403),
        };
      }
    }
    // If neither Origin nor Referer is present, allow (could be same-origin)
    return { valid: true };
  }

  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.includes(origin)) {
    console.warn("[Origin Verify] Blocked request from:", origin);
    return {
      valid: false,
      response: apiError("FORBIDDEN", "Origem não permitida", 403),
    };
  }

  return { valid: true };
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
