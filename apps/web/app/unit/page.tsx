import { redirect } from "next/navigation";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";

// /unit with no dispatchId — redirect to the member's most recent active
// dispatch. For demo, pick the newest active dispatch in the org.
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

  const most = data?.[0];
  if (!most) redirect("/?no_active_dispatch=1");
  redirect(`/unit/${most.id}`);
}
