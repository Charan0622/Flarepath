import { redirect } from "next/navigation";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";
import { ensureActiveDispatch } from "@/lib/demo-seed";

// Auth-gated redirect resolver — never prerender.
export const dynamic = "force-dynamic";

// /chief with no dispatchId — jump straight to the most recent active dispatch.
// If there's no active dispatch, auto-seed a demo one so the chief console is
// never stranded on an empty state.
export default async function ChiefIndexPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/login");

  const db = getServiceClient();
  const { data } = await db
    .from("dispatches")
    .select("id, assigned_at, status")
    .in("status", ["assigned", "acknowledged", "en_route", "on_scene"])
    .order("assigned_at", { ascending: false })
    .limit(1);

  const existing = data?.[0];
  if (existing) redirect(`/chief/${existing.id}`);

  const seeded = await ensureActiveDispatch(auth.profile.organization_id, auth.user.id);
  if (seeded) redirect(`/chief/${seeded}`);

  redirect("/?no_active_dispatch=1");
}
