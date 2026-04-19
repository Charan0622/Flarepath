import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Singleton service client — reused across all requests (no cookies needed)
let _serviceClient: SupabaseClient | null = null;

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

export function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _serviceClient;
}

export async function getAuthenticatedUser() {
  const supabase = getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const db = getServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("id, organization_id, role, full_name")
    .eq("id", user.id)
    .single();

  return profile ? { user, profile } : null;
}
