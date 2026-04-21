import { NextRequest } from "next/server";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";
import { apiSuccess, apiError } from "@/lib/api-response";
import { parseEWKBPoint } from "@/lib/postgis";

const ADDR_COORDS: Record<string, [number, number]> = {
  "201 S 4th St, San Jose, CA 95112": [-121.8850, 37.3335],
  "70 S 1st St, San Jose, CA 95113": [-121.8890, 37.3340],
  "I-280 at 7th St, San Jose, CA 95112": [-121.8770, 37.3350],
  "345 Park Ave, San Jose, CA 95110": [-121.8916, 37.3318],
  "Alum Rock Park, San Jose, CA 95127": [-121.8230, 37.3862],
  "1073 The Alameda, San Jose, CA 95126": [-121.9070, 37.3430],
  "377 Santana Row, San Jose, CA 95128": [-121.9478, 37.3210],
  "Lincoln Ave & Minnesota Ave, San Jose, CA 95125": [-121.8990, 37.3080],
  "2855 Stevens Creek Blvd, San Jose, CA 95050": [-121.9452, 37.3246],
  "3250 Zanker Rd, San Jose, CA 95134": [-121.9230, 37.4072],
};

const STATION_COORDS: Record<string, [number, number]> = {
  "SJFD Station 1": [-121.8900, 37.3394],
  "SJFD Station 7": [-121.9148, 37.3295],
  "SJFD Station 30": [-121.8350, 37.3660],
};

export async function GET(_req: NextRequest, { params }: { params: { dispatchId: string } }) {
  const auth = await getAuthenticatedUser();
  if (!auth) return apiError("Unauthorized", 401);

  const db = getServiceClient();

  const { data: dispatch, error } = await db
    .from("dispatches").select("*").eq("id", params.dispatchId).single();
  if (error || !dispatch) return apiError("Dispatch not found", 404);

  const [incidentRes, vehicleRes, triageRes] = await Promise.all([
    db.from("incidents").select("id, type, severity, status, address, created_at, description, hazards, reporter_name, location")
      .eq("id", dispatch.incident_id).single(),
    db.from("vehicles").select("id, call_sign, type, station_id, current_location").eq("id", dispatch.vehicle_id).single(),
    db.from("ai_triage").select("*").eq("incident_id", dispatch.incident_id).maybeSingle(),
  ]);

  const incident = incidentRes.data;
  const vehicle = vehicleRes.data;
  const triage = triageRes.data;
  if (!incident || !vehicle) return apiError("Missing data", 404);

  const { data: station } = vehicle.station_id
    ? await db.from("stations").select("id, name, address, location").eq("id", vehicle.station_id).maybeSingle()
    : { data: null };

  const incidentCoords = parseEWKBPoint(incident.location) ?? ADDR_COORDS[incident.address] ?? null;
  const stationCoords = station ? (parseEWKBPoint(station.location) ?? STATION_COORDS[station.name] ?? null) : null;

  return apiSuccess({
    dispatch: {
      id: dispatch.id, status: dispatch.status,
      assigned_at: dispatch.assigned_at, en_route_at: dispatch.en_route_at,
      on_scene_at: dispatch.on_scene_at, completed_at: dispatch.completed_at,
      eta_seconds: dispatch.eta_seconds, distance_m: dispatch.distance_m,
      route_geojson: dispatch.route_geojson,
    },
    incident: {
      id: incident.id, type: incident.type, severity: incident.severity,
      status: incident.status, address: incident.address, created_at: incident.created_at,
      description: incident.description, hazards: incident.hazards,
      reporter_name: incident.reporter_name, coords: incidentCoords,
    },
    vehicle: { id: vehicle.id, call_sign: vehicle.call_sign, type: vehicle.type, station_id: vehicle.station_id },
    station: station ? { id: station.id, name: station.name, address: station.address, coords: stationCoords } : null,
    triage,
  });
}
