"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./config";

let cachedClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}
