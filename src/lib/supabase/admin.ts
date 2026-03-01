import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseAdminClient = SupabaseClient;

let cachedClient: SupabaseAdminClient | null = null;

/**
 * Returns a Supabase admin client using the service role key.
 * The client is cached for the lifetime of the process to avoid
 * creating a new instance on every request.
 *
 * Returns null when env vars are missing (e.g., local dev without keys).
 */
export function getSupabaseAdmin(): SupabaseAdminClient | null {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  cachedClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cachedClient;
}

/**
 * Looks up a single Supabase Auth user by email.
 * Returns the user object if found, null otherwise.
 *
 * Uses paginated listUsers under the hood. For a barbershop-sized
 * user base (< 1 000 users) this is efficient enough; for larger
 * apps, consider querying `auth.users` via raw SQL or a GoTrue
 * REST endpoint with search support.
 */
export async function findAuthUserByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error || !data?.users?.length) return null;

    const match = data.users.find((u) => u.email === email);
    if (match) return { id: match.id, email: match.email ?? email };

    if (data.users.length < perPage) return null;
    page++;
  }
}

/**
 * Builds a userId → email lookup map for all Supabase Auth users.
 * Useful for batch-resolving emails (e.g., admin loyalty dashboard).
 */
export async function getAuthUserEmailMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const admin = getSupabaseAdmin();
  if (!admin) return map;

  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error || !data?.users?.length) break;

    for (const u of data.users) {
      if (u.email) map.set(u.id, u.email);
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return map;
}
