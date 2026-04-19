import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/dispatch/active — all active dispatches with routes + vehicle + incident info
export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) return apiError("Unauthorized", 401);

  const db = getServiceClient();

  const { data: dispatches } = await db
    .from("dispatches")
    .select("id, incident_id, vehicle_id, status, route_geojson, distance_m, eta_seconds, assigned_at, acknowledged_at, en_route_at, on_scene_at")
    .in("status", ["assigned", "acknowledged", "en_route", "on_scene"])
    .order("assigned_at", { ascending: false });

  if (!dispatches || dispatches.length === 0) {
    return apiSuccess({ dispatches: [] });
  }

  // Get vehicle details
  const vehicleIds = [...new Set(dispatches.map((d) => d.vehicle_id))];
  const { data: vehicles } = await db
    .from("vehicles")
    .select("id, call_sign, type, station_id")
    .in("id", vehicleIds);

  const vehicleMap = new Map((vehicles ?? []).map((v) => [v.id, v]));

  // Get incident details
  const incidentIds = [...new Set(dispatches.map((d) => d.incident_id))];
  const { data: incidents } = await db
    .from("incidents")
    .select("id, type, severity, address, status")
    .in("id", incidentIds);

  const incidentMap = new Map((incidents ?? []).map((i) => [i.id, i]));

  const enriched = dispatches.map((d) => ({
    ...d,
    vehicle: vehicleMap.get(d.vehicle_id) ?? null,
    incident: incidentMap.get(d.incident_id) ?? null,
  }));

  return apiSuccess({ dispatches: enriched });
}
