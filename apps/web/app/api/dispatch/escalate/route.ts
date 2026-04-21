import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
  });
}

// POST /api/dispatch/escalate — check for unacknowledged dispatches and reassign
export async function POST(_request: NextRequest) {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - 60 * 1000).toISOString(); // 60 seconds ago

  // Find dispatches still in "assigned" that are older than 60s
  const { data: stale } = await supabase
    .from("dispatches")
    .select("*, incidents(type, address, organization_id)")
    .eq("status", "assigned")
    .lt("assigned_at", cutoff);

  if (!stale || stale.length === 0) {
    return apiSuccess({ escalated: 0, message: "No stale dispatches" });
  }

  const escalated: string[] = [];

  for (const dispatch of stale) {
    // Mark current dispatch as completed (timed out)
    await supabase.from("dispatches").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", dispatch.id);

    // Make vehicle available again
    await supabase.from("vehicles").update({ status: "available" }).eq("id", dispatch.vehicle_id);

    // Find next available vehicle (excluding the timed-out one)
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, call_sign")
      .eq("status", "available")
      .neq("id", dispatch.vehicle_id)
      .limit(1);

    if (vehicles && vehicles.length > 0) {
      const { data: newDispatch } = await supabase
        .from("dispatches")
        .insert({ incident_id: dispatch.incident_id, vehicle_id: vehicles[0].id })
        .select()
        .single();

      if (newDispatch) escalated.push(newDispatch.id);
    }
  }

  return apiSuccess({ escalated: escalated.length, dispatch_ids: escalated });
}
