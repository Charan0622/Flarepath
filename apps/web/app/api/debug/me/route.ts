import "server-only";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// GET /api/debug/me — returns the current auth state + profile + seed data
// counts. Used to diagnose routing / permission issues from the client.
// Safe to keep in the deployed app: only returns IDs and names, no secrets.
export async function GET() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const env = {
    has_supabase_url: !!url,
    has_anon_key: !!anon,
    has_service_key: !!service,
  };

  if (!url || !anon || !service) {
    return NextResponse.json({ env, error: "env vars missing on server" }, { status: 200 });
  }

  // Auth via anon/cookies
  const authClient = createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() { /* read-only */ },
    },
  });

  const { data: { user } } = await authClient.auth.getUser();

  // Admin view via service role
  const admin = createClient(url, service);
  const { count: orgCount } = await admin.from("organizations").select("*", { count: "exact", head: true });
  const { count: profileCount } = await admin.from("profiles").select("*", { count: "exact", head: true });
  const { count: stationCount } = await admin.from("stations").select("*", { count: "exact", head: true });
  const { count: vehicleCount } = await admin.from("vehicles").select("*", { count: "exact", head: true });
  const { count: incidentCount } = await admin.from("incidents").select("*", { count: "exact", head: true });
  const { count: dispatchCount } = await admin.from("dispatches").select("*", { count: "exact", head: true });

  const { data: activeDispatches } = await admin
    .from("dispatches")
    .select("id, status")
    .in("status", ["assigned", "acknowledged", "en_route", "on_scene"])
    .limit(5);

  let myProfile = null;
  if (user) {
    const { data: p } = await admin.from("profiles").select("id, role, full_name, organization_id").eq("id", user.id).maybeSingle();
    myProfile = p;
  }

  const { data: seedOrg } = await admin
    .from("organizations").select("id, name")
    .eq("id", "4a780897-794c-42eb-9944-e81cb8e00623").maybeSingle();

  return NextResponse.json({
    env,
    auth_user: user ? { id: user.id, email: user.email } : null,
    my_profile: myProfile,
    seed_org_exists: !!seedOrg,
    counts: {
      organizations: orgCount ?? 0,
      profiles: profileCount ?? 0,
      stations: stationCount ?? 0,
      vehicles: vehicleCount ?? 0,
      incidents: incidentCount ?? 0,
      dispatches: dispatchCount ?? 0,
    },
    active_dispatches: activeDispatches ?? [],
  });
}
