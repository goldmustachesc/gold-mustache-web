/**
 * Validates a redirect path to prevent open redirect attacks.
 *
 * Defends against protocol-relative URLs (//evil.com),
 * backslash-based bypasses (/\evil.com), header injection
 * via control characters (%0d%0a), and double-encoded payloads.
 */
export function getSafeRedirectPath(next: string | null): string {
  const defaultPath = "/dashboard";

  if (!next) return defaultPath;

  // Decode percent-encoded characters so checks below can't be bypassed
  // with payloads like %2F%2Fevil.com or %5Cevil.com.
  // URLSearchParams.get() already decodes once, but this guards against
  // double-encoding or future call sites that pass raw strings.
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return defaultPath;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return defaultPath;

  const hasControlChars = Array.from(decoded).some(
    (ch) => ch.charCodeAt(0) < 0x20,
  );
  if (hasControlChars) return defaultPath;

  if (decoded.includes("\\")) return defaultPath;

  return decoded;
}
