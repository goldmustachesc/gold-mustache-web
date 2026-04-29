import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./config";
import { logger } from "@/lib/logger";

export interface SessionUpdateResult {
  supabaseResponse: NextResponse;
  user: { id: string } | null;
  authError: boolean;
}

export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdateResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabaseResponse, user: null, authError: false };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh session if expired
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { supabaseResponse, user, authError: false };
  } catch (error) {
    logger.warn({ error }, "Falha ao atualizar sessão Supabase no proxy");

    return { supabaseResponse, user: null, authError: true };
  }
}
