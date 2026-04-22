import "server-only";
import { getServiceClient } from "@/lib/supabase/api";

// For a portfolio demo, Chief and Unit Member consoles are useless without
// an active dispatch. If the database has no active dispatch when a chief or
// firefighter logs in, seed one on-demand: pick any vehicle in their org,
// create a realistic San Jose structure-fire incident, dispatch the vehicle
// to it. Returns the dispatch id either way.

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

export async function ensureActiveDispatch(organizationId: string, createdBy: string): Promise<string | null> {
  const db = getServiceClient();

  // Already an active dispatch? use it.
  const { data: existing } = await db
    .from("dispatches")
    .select("id")
    .in("status", ["assigned", "acknowledged", "en_route", "on_scene"])
    .order("assigned_at", { ascending: false })
    .limit(1);
  if (existing && existing[0]) return existing[0].id;

  // Need a vehicle to dispatch — any one in the org is fine for the demo.
  const { data: vehicles } = await db
    .from("vehicles")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);
  const vehicle = vehicles?.[0];
  if (!vehicle) return null;

  // Pick a demo incident and insert it.
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
  if (incErr || !incident) return null;

  // Dispatch the vehicle to it.
  const { data: dispatch, error: dispErr } = await db
    .from("dispatches")
    .insert({
      incident_id: incident.id,
      vehicle_id: vehicle.id,
      status: "en_route",
      assigned_at: new Date().toISOString(),
      en_route_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (dispErr || !dispatch) return null;

  // Mark incident + vehicle as in-progress so the dispatcher page also
  // reflects the state consistently.
  await db.from("incidents").update({ status: "dispatched" }).eq("id", incident.id);
  await db.from("vehicles").update({ status: "dispatched" }).eq("id", vehicle.id);

  return dispatch.id;
}
