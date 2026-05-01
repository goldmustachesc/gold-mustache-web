/**
 * Detect Supabase auth cookie presence by name without instantiating the SSR
 * client. Supabase SSR sets cookies named `sb-<project-ref>-auth-token` (and
 * chunked variants `sb-<ref>-auth-token.0`, `.1`, ...). Anonymous requests
 * have none.
 */
const SUPABASE_AUTH_COOKIE_NAME = /^sb-.+-auth-token(?:\.\d+)?$/;

export function hasSupabaseAuthCookieName(cookieNames: string[]): boolean {
  return cookieNames.some((name) => SUPABASE_AUTH_COOKIE_NAME.test(name));
}
