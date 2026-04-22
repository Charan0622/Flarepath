import "server-only";
import { getServiceClient } from "@/lib/supabase/api";

// Full demo bootstrap: chief + unit consoles are useless without a dispatch,
// which requires a vehicle, which requires a station. On a clean Supabase
// where only organizations + profiles exist, this function idempotently
// creates the whole dependency chain: station → vehicle → incident → dispatch.
// Returns the dispatch id or null if the DB call chain failed somewhere.

const DEMO_STATION = {
  name: "SJFD Station 1",
  address: "225 N Market St, San Jose, CA 95110",
  lng: -121.8900, lat: 37.3394,
};

const DEMO_VEHICLES = [
  { call_sign: "Engine 1", type: "engine", capacity: 6 },
  { call_sign: "Ladder 1", type: "ladder", capacity: 4 },
  { call_sign: "Rescue 1", type: "rescue", capacity: 4 },
];

const DEMO_INCIDENTS = [
  {
    address: "432 E Santa Clara St, San Jose, CA 95112",
    lng: -121.8816, lat: 37.3394,
    type: "structure_fire" as const,
    severity: "high" as const,
    description: "Smoke from 3rd-floor apartment, two occupants unaccounted for.",
    hazards: ["trapped_occupants", "high_rise"],
  },
  {
    address: "1120 The Alameda, San Jose, CA 95126",
    lng: -121.9070, lat: 37.3430,
    type: "vehicle_fire" as const,
    severity: "medium" as const,
    description: "Engine compartment fire on a sedan, driver out and safe.",
    hazards: ["fuel_leak", "traffic_hazard"],
  },
  {
    address: "3055 Alum Rock Ave, San Jose, CA 95127",
    lng: -121.8230, lat: 37.3862,
    type: "structure_fire" as const,
    severity: "critical" as const,
    description: "Commercial building, heavy smoke on east side, sprinklers partially activated.",
    hazards: ["structural_collapse", "chemical_fumes"],
  },
];

async function ensureStation(orgId: string): Promise<string | null> {
  const db = getServiceClient();
  const { data: existing } = await db
    .from("stations")
    .select("id")
    .eq("organization_id", orgId)
    .limit(1);
  if (existing?.[0]) return existing[0].id;

  const { data, error } = await db
    .from("stations")
    .insert({
      organization_id: orgId,
      name: DEMO_STATION.name,
      address: DEMO_STATION.address,
      location: `POINT(${DEMO_STATION.lng} ${DEMO_STATION.lat})`,
    })
    .select("id")
    .single();
  if (error) { console.error("[demo-seed] station insert failed:", error); return null; }
  if (!data) return null;
  return data.id;
}

async function ensureVehicle(orgId: string, stationId: string): Promise<string | null> {
  const db = getServiceClient();
  const { data: existing } = await db
    .from("vehicles")
    .select("id")
    .eq("organization_id", orgId)
    .limit(1);
  if (existing?.[0]) return existing[0].id;

  const rows = DEMO_VEHICLES.map((v) => ({
    organization_id: orgId,
    station_id: stationId,
    call_sign: v.call_sign,
    type: v.type,
    capacity: v.capacity,
    current_location: `POINT(${DEMO_STATION.lng} ${DEMO_STATION.lat})`,
  }));
  const { data, error } = await db.from("vehicles").insert(rows).select("id").limit(1);
  if (error) { console.error("[demo-seed] vehicle insert failed:", error); return null; }
  if (!data?.[0]) return null;
  return data[0].id;
}

export async function ensureActiveDispatch(organizationId: string, createdBy: string): Promise<string | null> {
  const db = getServiceClient();

  const { data: existing } = await db
    .from("dispatches")
    .select("id")
    .in("status", ["assigned", "acknowledged", "en_route", "on_scene"])
    .order("assigned_at", { ascending: false })
    .limit(1);
  if (existing?.[0]) return existing[0].id;

  const stationId = await ensureStation(organizationId);
  if (!stationId) { console.error("[demo-seed] station step returned null"); return null; }

  const vehicleId = await ensureVehicle(organizationId, stationId);
  if (!vehicleId) { console.error("[demo-seed] vehicle step returned null"); return null; }

  const demo = DEMO_INCIDENTS[Math.floor(Math.random() * DEMO_INCIDENTS.length)];
  const { data: incident, error: incErr } = await db
    .from("incidents")
    .insert({
      organization_id: organizationId,
      location: `POINT(${demo.lng} ${demo.lat})`,
      address: demo.address,
      type: demo.type,
      severity: demo.severity,
      status: "triaged",
      description: demo.description,
      hazards: demo.hazards,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (incErr) { console.error("[demo-seed] incident insert failed:", incErr); return null; }
  if (!incident) return null;

  const { data: dispatch, error: dispErr } = await db
    .from("dispatches")
    .insert({
      incident_id: incident.id,
      vehicle_id: vehicleId,
      status: "en_route",
      assigned_at: new Date().toISOString(),
      en_route_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (dispErr) { console.error("[demo-seed] dispatch insert failed:", dispErr); return null; }
  if (!dispatch) return null;

  await db.from("incidents").update({ status: "dispatched" }).eq("id", incident.id);
  await db.from("vehicles").update({ status: "dispatched" }).eq("id", vehicleId);

  return dispatch.id;
}
