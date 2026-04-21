import { NextRequest } from "next/server";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";
import { apiSuccess, apiError } from "@/lib/api-response";

// POST /api/incidents/:id/resolve
// Cascades: completes all active dispatches for this incident, frees their vehicles,
// and marks the incident status = resolved. Intended as a one-click action for the dispatcher.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) return apiError("Unauthorized", 401);
  if (!["dispatcher", "admin", "chief"].includes(auth.profile.role)) {
    return apiError("Insufficient permissions", 403);
  }

  const db = getServiceClient();

  const { data: incident } = await db
    .from("incidents")
    .select("id, status, organization_id")
    .eq("id", params.id)
    .single();

  if (!incident) return apiError("Incident not found", 404);
  if (incident.organization_id !== auth.profile.organization_id) {
    return apiError("Forbidden", 403);
  }
  if (incident.status === "resolved" || incident.status === "cancelled") {
    return apiError(`Incident is already ${incident.status}`, 409);
  }

  const nowIso = new Date().toISOString();

  const { data: activeDispatches } = await db
    .from("dispatches")
    .select("id, vehicle_id, status")
    .eq("incident_id", params.id)
    .in("status", ["assigned", "acknowledged", "en_route", "on_scene", "returning"]);

  if (activeDispatches && activeDispatches.length > 0) {
    const dispatchIds = activeDispatches.map((d) => d.id);
    const vehicleIds = Array.from(new Set(activeDispatches.map((d) => d.vehicle_id)));

    await db
      .from("dispatches")
      .update({ status: "completed", completed_at: nowIso })
      .in("id", dispatchIds);

    await db.from("vehicles").update({ status: "available" }).in("id", vehicleIds);
  }

  const { data: updated, error } = await db
    .from("incidents")
    .update({ status: "resolved" })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return apiSuccess({
    incident: updated,
    completed_dispatches: activeDispatches?.length ?? 0,
  });
}
