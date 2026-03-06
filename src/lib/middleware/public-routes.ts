const PUBLIC_API_EXACT = ["/api/barbers", "/api/services", "/api/slots"];

const PUBLIC_API_PREFIXES = ["/api/instagram", "/api/consent", "/api/cron"];

export function isPublicApiRoute(pathname: string): boolean {
  if (PUBLIC_API_EXACT.includes(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
