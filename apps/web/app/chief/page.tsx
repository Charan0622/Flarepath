import { redirect } from "next/navigation";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";

// /chief with no dispatchId — pick the most recent active dispatch and jump
// straight to its chief console. Falls back to the home page if there are
// no active dispatches.
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

  const most = data?.[0];
  if (!most) redirect("/?no_active_dispatch=1");
  redirect(`/chief/${most.id}`);
}
