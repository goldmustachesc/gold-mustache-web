import { NextResponse } from "next/server";

/**
 * List of allowed origins for CSRF protection.
 * Includes production URL, staging URLs, and localhost for development.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Production URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    origins.push(process.env.NEXT_PUBLIC_SITE_URL);
    // Also allow www subdomain
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL);
    if (!url.hostname.startsWith("www.")) {
      origins.push(`${url.protocol}//www.${url.hostname}`);
    }
  }

  // Vercel deployment URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Development
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://localhost:3001");
    origins.push("http://127.0.0.1:3000");
    origins.push("http://127.0.0.1:3001");
  }

  return origins;
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
      const refererOrigin = new URL(referer).origin;
      const allowedOrigins = getAllowedOrigins();
      if (!allowedOrigins.includes(refererOrigin)) {
        console.warn("[Origin Verify] Invalid referer:", refererOrigin);
        return {
          valid: false,
          response: NextResponse.json(
            { error: "FORBIDDEN", message: "Origem não permitida" },
            { status: 403 },
          ),
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
      response: NextResponse.json(
        { error: "FORBIDDEN", message: "Origem não permitida" },
        { status: 403 },
      ),
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
