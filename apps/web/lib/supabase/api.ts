import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Auth-aware client (anon key) — use for auth.getUser() only.
 * Do NOT use for DB queries — RLS policies may cause recursion.
 */
export function getAuthClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

/**
 * Service role client — bypasses RLS. Use for all DB operations in API routes.
 */
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Helper: get authenticated user + profile in one call.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser() {
  const supabase = getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const db = getServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ? { user, profile } : null;
}
