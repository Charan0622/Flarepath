import { redirect } from "next/navigation";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";
import { ensureActiveDispatch } from "@/lib/demo-seed";

// Auth-gated redirect resolver — never prerender.
export const dynamic = "force-dynamic";

// /unit with no dispatchId — jump to the member's most recent active dispatch.
// If none exists, auto-seed a demo dispatch so the Unit Member HUD always has
// data to render instead of bouncing the user back to the dispatcher page.
export default async function UnitIndexPage() {
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
  if (existing) redirect(`/unit/${existing.id}`);

  const seeded = await ensureActiveDispatch(auth.profile.organization_id, auth.user.id);
  if (seeded) redirect(`/unit/${seeded}`);

  redirect("/?no_active_dispatch=1");
}
